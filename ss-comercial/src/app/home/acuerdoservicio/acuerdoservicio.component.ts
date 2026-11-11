import { Component, HostListener } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, Subject, switchMap, tap } from 'rxjs';
import { AppComponent } from 'src/app/app.component';
import { AcuerdoservicioService } from 'src/app/services/acuerdoservicio.service';
import { AuthService } from 'src/app/services/auth.service';
import { ChecklistService } from 'src/app/services/checklist.service';
import { LoadingService } from 'src/app/services/loading.service';
import { PygService } from 'src/app/services/pyg.service';
import { ToastrService } from 'src/app/services/toastr.service';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-acuerdoservicio',
  templateUrl: './acuerdoservicio.component.html',
  styleUrls: ['./acuerdoservicio.component.css']
})
export class AcuerdoservicioComponent {
  lstCargos: any = [
    { nombre: 'Gerencia', id: 1 },
    { nombre: 'Dirección Comercial', id: 2 },
    { nombre: 'Jefe Siniestros', id: 3 },
    { nombre: 'Cobranzas', id: 4 },
    { nombre: 'Coordinadora de Operaciones', id: 5 },
    { nombre: 'Ejecutiva de Operaciones', id: 6 },
    { nombre: 'Coordinador Masivos', id: 7 }
  ];

  lstContactos: any[] = [];
  lstResponsables: any[] = [];
  lstBeneficios: any[] = [];
  lstValoresAgregados: any[] = [];
  lstAseguradoras:any[]=[];
  lstSLAS: any[] = [];
  lstSLASOperaciones: any[] = [];
  tipoSLAActivo: 'siniestros' | 'operaciones' = 'siniestros';
  modalActivo: 'contacto' | 'sla' | 'beneficio' | 'valor' | null = null;
  ingresoForm!: FormGroup;
  contactoForm!: FormGroup;
  slasForm!: FormGroup;
  beneficiosForm!: FormGroup;
  agregadosForm!: FormGroup;
  esEdicionContacto: boolean = false;
  esEdicionBeneficio: boolean = false;
  esEdicionValor: boolean = false;
  esEdicionSLA: boolean = false;
  userCurrent: any;
  clientes: any[] = [];
  clientesInput$ = new Subject<string>();
  loadingClientes = false;
  idIngreso: any;
  constructor(private fb: FormBuilder,
    private loadingService: LoadingService,
    private toastrService: ToastrService,
    private appComponent: AppComponent,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private acuerdoservicioService: AcuerdoservicioService,
    private checklistService: ChecklistService,
    private pygService: PygService
  ) { }
  async obtenerUsuario() {
    this.userCurrent = await this.authService.getUserInfor();
  }
  ngOnInit(): void {

    if (this.route.snapshot.paramMap.get("id")) {
      this.idIngreso = this.route.snapshot.paramMap.get("id");
    }

    this.obtenerUsuario();
    this.InicializarInformacionForm();
    if (this.idIngreso) {
      this.cargarDatosAcuerdo();
    }
  }
  InicializarInformacionForm() {
    this.ingresoForm = this.fb.group({
      idIngreso: [''],
      idEstado: [''],
      idResponsable: [2, Validators.required],
      ramo: [1, Validators.required],
      cliente: [null, Validators.required],
      ruc: ['', [
        Validators.required,
        Validators.pattern(/^[0-9]{13}$/)
      ]],
      direccion: ['', Validators.required],
      ciudad: ['', Validators.required],
      telefono: ['', Validators.required],
      correoCliente: ['', Validators.email],
      contacto: ['', Validators.required],
      aseguradora: [null],
      inicioVigencia: [new Date().toISOString().substring(0, 10), Validators.required],
      finVigencia: [
        new Date(new Date().setFullYear(new Date().getFullYear() + 1))
          .toISOString()
          .substring(0, 10),
        Validators.required
      ]
    }, { validators: this.validarRangoFechas });
    this.slasForm = this.fb.group({
      id: [''],
      actividad: ['', Validators.required],
      // El guion largo es un valor válido: en varios procesos no aplica un SLA.
      sla: ['—', Validators.required],
      sla_aseguradora: ['—', Validators.required],
      consideraciones: ['', Validators.required]
    });

    this.contactoForm = this.fb.group({
      idCargo: ['', Validators.required],
      nombreCargo: [''],
      nombre: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      celular: ['', Validators.required]
    });
    this.agregadosForm = this.fb.group({
      nombreValor: ['', Validators.required],
      cantidadValor: ['', [Validators.required, Validators.min(1)]],
      detalleValor: ['', Validators.required]
    });
    this.beneficiosForm = this.fb.group({
      nombreBeneficio: ['', Validators.required],
      cantidadBeneficio: ['', [Validators.required, Validators.min(1)]],
      detalleBeneficio: ['', Validators.required],
      valorBeneficio: ['', [Validators.required, Validators.min(0)]],
      fechaCumplimiento: ['', Validators.required]
    });
    const ramo = this.ingresoForm.get('ramo')?.value;
    this.acuerdoservicioService.obtenerContactosInicialesRamo(ramo).subscribe((res: any) => {
      if (!this.idIngreso) {
        this.lstContactos = Array.isArray(res?.data) ? [...res.data] : [];
        this.lstBeneficios = Array.isArray(res?.beneficios) ? [...res.beneficios] : [];
        this.cargarSLASPorRamo();
      }
      this.lstResponsables = Array.isArray(res?.responsables) ? res.responsables : [];
    }, (error: any) => {
      this.loadingService.hideLoading();
      this.toastrService.error('ERROR', 'No se pudo obtener los contactos!');
    });
    //
    this.clientesInput$
      .pipe(
        debounceTime(400),
        tap(() => this.loadingClientes = true),
        switchMap(term => this.pygService.consultarClienteNombreCompleto(term))
      )
      .subscribe((resp: any) => {
        this.clientes = resp?.resultado;
        this.loadingClientes = false;
      });
    setTimeout(() => {
      this.loadingService.hideLoading();
    }, 1500);
        this.checklistService.obtenerAseguradoras().subscribe((res: any) => {
      this.lstAseguradoras = res.resultado;
    }, (error: any) => {
      this.toastrService.error('ERROR', 'No se pudo obtener la información de Aseguradoras!');
    });
  }
  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.modalActivo) this.cerrarModal(); }

  cerrarModal(): void {
    this.modalActivo = null;
    this.esEdicionContacto = false;
    this.esEdicionSLA = false;
    this.esEdicionBeneficio = false;
    this.esEdicionValor = false;
    this.indexContacto = null;
    this.indexSLA = null;
    this.indexBeneficio = null;
    this.indexAgregado = null;
    this.contactoForm.reset({idCargo: '', nombreCargo: '', nombre: '', correo: '', celular: ''});
    this.limpiarFormularioSLA();
    this.beneficiosForm.reset();
    this.agregadosForm.reset();
  }

  abrirModalContacto(): void {
    this.cerrarModal();
    this.modalActivo = 'contacto';
  }

  agregarContacto(): void {
    if (this.contactoForm.invalid) {
      this.contactoForm.markAllAsTouched();
      this.toastrService.error('ERROR', 'Complete los datos obligatorios del contacto.');
      return;
    }
    const registro = this.contactoForm.value;
    this.lstContactos.push({
      ...registro,
      nombreCargo: this.lstCargos.find((c: any) => String(c.id) === String(registro.idCargo))?.nombre ?? ''
    });
    this.cerrarModal();
    this.toastrService.success('Correcto', 'Contacto agregado correctamente.');
  }

  // Ambos arreglos contienen actividades completas, incluyendo sla_aseguradora
  // como propiedad de cada actividad, no como lista separada.
  // El backend puede devolver todos los SLA guardados en una sola lista.
  // El campo "tipo" identifica a qué tabla pertenece cada registro.
  private esSLAOperaciones(tipo: any): boolean {
    return String(tipo ?? '').trim().toLowerCase() === 'operaciones';
  }

  private normalizarSLAS(registros: any[], tipo?: 'Siniestros' | 'Operaciones'): any[] {
    return registros.map((item: any) => {
      const broker = String(item?.sla ?? '').trim();
      const aseguradora = String(item?.sla_aseguradora ?? '').trim();
      return {
        ...item,
        // Al guardar nuevas actividades, conserva el tipo que permite recuperarlas.
        tipo: tipo ?? (this.esSLAOperaciones(item?.tipo) ? 'Operaciones' : 'Siniestros'),
        actividad: item?.actividad ?? '',
        sla: broker || '—',
        sla_aseguradora: aseguradora || '—',
        consideraciones: item?.consideraciones ?? ''
      };
    });
  }

  private cargarSLASPorRamo(preservarSiniestros = false, preservarOperaciones = false): void {
    const ramo = this.ingresoForm.get('ramo')?.value;
    if (!ramo) return;
        this.acuerdoservicioService.obtenerContactosInicialesRamo(ramo).subscribe((res: any) => {
      if (!this.idIngreso) {
        this.lstContactos = Array.isArray(res?.data) ? [...res.data] : [];
        this.lstBeneficios = Array.isArray(res?.beneficios) ? [...res.beneficios] : [];
      }
      this.lstResponsables = Array.isArray(res?.responsables) ? res.responsables : [];
    }, (error: any) => {
      this.loadingService.hideLoading();
      this.toastrService.error('ERROR', 'No se pudo obtener los contactos!');
    });

    this.acuerdoservicioService.getSLASRamo(ramo).subscribe({
      next: (res: any) => {
        // No aplicar una respuesta antigua si el usuario ya cambió de ramo.
        if (String(this.ingresoForm.get('ramo')?.value) !== String(ramo)) return;
        if (!preservarSiniestros) {
          this.lstSLAS = this.normalizarSLAS(Array.isArray(res?.data1) ? res.data1 : [], 'Siniestros');
        }
        if (!preservarOperaciones) {
          this.lstSLASOperaciones = this.normalizarSLAS(Array.isArray(res?.data2) ? res.data2 : [], 'Operaciones');
        }
      },
      error: () => this.toastrService.error('ERROR', 'No se pudieron cargar los SLA del ramo.')
    });
  }

  private limpiarFormularioSLA(): void {
    this.slasForm.reset({
      id: '', actividad: '', sla: '—', sla_aseguradora: '—', consideraciones: ''
    });
    this.esEdicionSLA = false;
    this.indexSLA = null;
  }

  private prepararSLAFormulario(): any {
    const sla = this.slasForm.value;
    return {
      ...sla,
      tipo: this.tipoSLAActivo === 'operaciones' ? 'Operaciones' : 'Siniestros',
      actividad: String(sla.actividad ?? '').trim(),
      sla: String(sla.sla ?? '').trim() || '—',
      sla_aseguradora: String(sla.sla_aseguradora ?? '').trim() || '—',
      consideraciones: String(sla.consideraciones ?? '').trim()
    };
  }

  private listaSLAActiva(): any[] {
    return this.tipoSLAActivo === 'operaciones' ? this.lstSLASOperaciones : this.lstSLAS;
  }

  abrirModalSLA(tipo: 'siniestros' | 'operaciones'): void {
    this.cerrarModal();
    this.tipoSLAActivo = tipo;
    this.modalActivo = 'sla';
  }

  agregarSLA(): void {
    const nuevo = this.prepararSLAFormulario();
    if (this.slasForm.invalid || !nuevo.actividad || !nuevo.consideraciones) {
      this.slasForm.markAllAsTouched();
      this.toastrService.error('ERROR', 'Complete actividad, SLA y consideraciones.');
      return;
    }
    this.listaSLAActiva().push(nuevo);
    this.cerrarModal();
    this.toastrService.success('Correcto', 'SLA agregado correctamente.');
  }

  indexSLA: number | null = null;

  editarSLA(index: number, tipo: 'siniestros' | 'operaciones' = 'siniestros'): void {
    this.abrirModalSLA(tipo);
    const item = this.listaSLAActiva()[index];
    if (!item) { this.cerrarModal(); return; }
    this.indexSLA = index;
    this.esEdicionSLA = true;
    this.slasForm.patchValue({
      id: item.id ?? '', actividad: item.actividad ?? '',
      sla: item.sla ?? '—', sla_aseguradora: item.sla_aseguradora ?? '—',
      consideraciones: item.consideraciones ?? ''
    });
  }

  eliminarSLA(index: number, tipo: 'siniestros' | 'operaciones' = 'siniestros'): void {
    const lista = tipo === 'operaciones' ? this.lstSLASOperaciones : this.lstSLAS;
    lista.splice(index, 1);
    if (this.modalActivo === 'sla' && this.tipoSLAActivo === tipo) this.cerrarModal();
  }

  actualizarSLA(): void {
    const item = this.prepararSLAFormulario();
    const lista = this.listaSLAActiva();
    if (this.indexSLA === null || !lista[this.indexSLA] || this.slasForm.invalid || !item.actividad || !item.consideraciones) {
      this.slasForm.markAllAsTouched();
      this.toastrService.error('ERROR', 'Revise los datos antes de actualizar.');
      return;
    }
    lista[this.indexSLA] = { ...lista[this.indexSLA], ...item };
    this.cerrarModal();
    this.toastrService.success('Correcto', 'SLA actualizado correctamente.');
  }

  cancelarSLA(): void { this.cerrarModal(); }

  indexContacto: number | null = null;

  editarContacto(index: number): void {
    const contacto = this.lstContactos[index];
    if (!contacto) return;
    this.abrirModalContacto();
    this.indexContacto = index;
    this.esEdicionContacto = true;
    this.contactoForm.patchValue({
      idCargo: contacto.idCargo ?? contacto.cargo ?? '',
      nombreCargo: contacto.nombreCargo ?? '', nombre: contacto.nombre ?? '',
      correo: contacto.correo ?? '', celular: contacto.celular ?? ''
    });
  }

  eliminarContacto(index: number): void {
    this.lstContactos.splice(index, 1);
    if (this.modalActivo === 'contacto') this.cerrarModal();
  }

  actualizarContacto(): void {
    if (this.indexContacto === null || !this.lstContactos[this.indexContacto] || this.contactoForm.invalid) {
      this.contactoForm.markAllAsTouched();
      this.toastrService.error('ERROR', 'Revise los datos del contacto.');
      return;
    }
    const registro = this.contactoForm.value;
    this.lstContactos[this.indexContacto] = {
      ...this.lstContactos[this.indexContacto], ...registro,
      nombreCargo: this.lstCargos.find((c: any) => String(c.id) === String(registro.idCargo))?.nombre ?? ''
    };
    this.cerrarModal();
    this.toastrService.success('Correcto', 'Contacto actualizado correctamente.');
  }

  cancelarContacto(): void { this.cerrarModal(); }

  acuerdoGenerado: boolean = false;

  generarAcuerdo() {
    if (this.ingresoForm.valid) {
      // if (this.lstBeneficios.length < 1) {
      //   this.toastrService.warning(
      //     'Aviso',
      //     'Debe  Ingresar el detalle de beneficios para el cliente.'
      //   );
      //   return;
      // }
      if (this.lstContactos.length < 1) {
        this.toastrService.warning(
          'Aviso',
          'Debe  Ingresar el detalle de Contactos.'
        );
        return;
      }
      if (this.lstSLAS.length < 1) {
        this.toastrService.warning(
          'Aviso',
          'Debe  Ingresar el detalle de SLAS.'
        );
        return;
      }
      const responsable = this.lstResponsables.find((item: any) => item.id == this.ingresoForm.value.idResponsable);
      if (!responsable) {
        this.toastrService.error('ERROR', 'Seleccione un responsable válido.');
        return;
      }
      this.loadingService.showLoading();
      let formAcuerdos = {
        responsable: responsable,
        idResponsable: responsable.id,
        idIngreso: this.ingresoForm.value.idIngreso,
        nombreCliente: this.ingresoForm.value.cliente,
        ruc: this.ingresoForm.value.ruc,
        direccion: this.ingresoForm.value.direccion,
        ciudad: this.ingresoForm.value.ciudad,
        telefono: this.ingresoForm.value.telefono,
        correoCliente: this.ingresoForm.value.correoCliente,
        contacto: this.ingresoForm.value.contacto,
        lstContactos: this.lstContactos,
        lstBeneficios: this.lstBeneficios,
        lstSLAS: this.normalizarSLAS(this.lstSLAS, 'Siniestros'),
        lstSLASOperaciones: this.normalizarSLAS(this.lstSLASOperaciones, 'Operaciones'),
        lstValoresAgregados: this.lstValoresAgregados.map((valor: any) => this.sinFechaValor(valor)),
        ramo: this.ingresoForm.value.ramo,
        inicioVigencia: this.ingresoForm.value.inicioVigencia,
        finVigencia: this.ingresoForm.value.finVigencia,
        idUsuario: this.userCurrent?.id,
        aseguradora:this.ingresoForm.value.aseguradora
      }
      let formD = new FormData();
      formD.append('datosIngreso', JSON.stringify(formAcuerdos));

      this.acuerdoservicioService.generarAcuerdoServicio(formD).subscribe((res: any) => {
        this.ingresoForm.patchValue({
          idIngreso: res.idIngreso,
          idEstado: 1
        });
        this.toastrService.success('Correcto!', 'Acuerdo de servicio generado correctamente!');
        const url = 'https://cotizador.segurossuarez.com/backend/storage/app/files/modeloAcuerdoServicio_generado.docx';
        Swal.fire({
          title: "Correcto!",
          text: "Para completar el proceso debe subir el documento firmado!",
          icon: "success"
        });
        window.open(url, '_blank');
        this.loadingService.hideLoading();
      }, (error: any) => {
        this.loadingService.hideLoading();
        this.toastrService.error('ERROR', 'No se pudo generar el acuerdo!');
      });
    } else {
      this.ingresoForm.markAllAsTouched();

      Object.keys(this.ingresoForm.controls).forEach(key => {
        const control = this.ingresoForm.get(key);

        if (control?.invalid) {
          console.log(`Campo inválido: ${key}`, control.errors);
        }
      });
      this.appComponent.validateAllFormFields(this.ingresoForm);
      this.toastrService.error(
        'Error al generar el acuerdo de servicio',
        'No se llenaron todos los campos necesarios.'
      );
    }
  }
  abrirModalBeneficio(): void {
    this.cerrarModal();
    this.modalActivo = 'beneficio';
  }

  agregarBeneficio(): void {
    if (this.beneficiosForm.invalid) {
      this.beneficiosForm.markAllAsTouched();
      this.toastrService.error('ERROR', 'Complete los datos del beneficio.');
      return;
    }
    this.lstBeneficios.push({ ...this.beneficiosForm.value });
    this.cerrarModal();
    this.toastrService.success('Correcto', 'Beneficio agregado correctamente.');
  }

  indexBeneficio: number | null = null;

  editarBeneficio(index: number): void {
    const item = this.lstBeneficios[index];
    if (!item) return;
    this.abrirModalBeneficio();
    this.indexBeneficio = index;
    this.esEdicionBeneficio = true;
    this.beneficiosForm.patchValue(item);
  }

  actualizarBeneficio(): void {
    if (this.indexBeneficio === null || !this.lstBeneficios[this.indexBeneficio] || this.beneficiosForm.invalid) {
      this.beneficiosForm.markAllAsTouched();
      this.toastrService.error('ERROR', 'Revise los datos del beneficio.');
      return;
    }
    this.lstBeneficios[this.indexBeneficio] = { ...this.lstBeneficios[this.indexBeneficio], ...this.beneficiosForm.value };
    this.cerrarModal();
    this.toastrService.success('Correcto', 'Beneficio actualizado correctamente.');
  }

  cancelarBeneficio(): void { this.cerrarModal(); }

  eliminarBeneficio(index: number): void {
    this.lstBeneficios.splice(index, 1);
    if (this.modalActivo === 'beneficio') this.cerrarModal();
  }

  clienteSeleccionado: any;
  onClienteChange(cliente: any) {
    this.clienteSeleccionado = cliente;
    this.ingresoForm.patchValue({
      ruc: this.clienteSeleccionado?.identificacion ?? '',
      direccion: this.clienteSeleccionado?.direccion ?? '',
      ciudad: this.clienteSeleccionado?.ciudad ?? '',
      telefono: this.formatearTelefono(this.clienteSeleccionado?.telefonoMovil),
      correoCliente: this.clienteSeleccionado?.correoElectronico
        ?? this.clienteSeleccionado?.correo
        ?? this.clienteSeleccionado?.email
        ?? this.clienteSeleccionado?.emailCliente
        ?? ''
    });
  }
  formatearTelefono(telefono: string | null | undefined): string {
    if (!telefono) return '';

    // Quitar espacios
    telefono = telefono.trim();

    // Si viene con +593 → convertir a 0
    if (telefono.startsWith('+593')) {
      telefono = '0' + telefono.substring(4);
    }

    // Si viene sin + pero empieza en 593
    if (telefono.startsWith('593')) {
      telefono = '0' + telefono.substring(3);
    }

    // Dejar solo números
    telefono = telefono.replace(/\D/g, '');

    // Asegurar máximo 10 dígitos
    return telefono.substring(0, 10);
  }
  completarAcuerdo() {
    Swal.fire({
      title: '<strong style="font-size:18px;">📄 Completar Acuerdo de Servicio</strong>',
      html: `
    <div style="font-size:13px; color:#6c757d; margin-bottom:10px;">
      Para completar el proceso debe cargar el documento de acuerdo de servicio firmado.
    </div>

    <div style="
        border: 2px dashed #ced4da;
        border-radius: 8px;
        padding: 15px;
        text-align: center;
        background: #f8f9fa;
    ">
        <i class="fas fa-cloud-upload-alt" style="font-size:28px; color:#344961; margin-bottom:8px;"></i>
        <input type="file" id="fileInput"
            style="font-size:12px;"
            accept=".pdf,.doc,.docx">
    </div>
  `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2159c8',
      cancelButtonColor: '#6c757d',
      background: '#ffffff',
      backdrop: 'rgba(0,0,0,0.4)',
      customClass: {
        popup: 'rounded-3 shadow'
      },
      preConfirm: () => {
        const input = document.getElementById('fileInput') as HTMLInputElement;

        if (!input.files || input.files.length === 0) {
          Swal.showValidationMessage('⚠️ Debe cargar el documento obligatoriamente');
          return false;
        }

        const file = input.files[0];

        // Validar tamaño (opcional)
        if (file.size > 5 * 1024 * 1024) {
          Swal.showValidationMessage('El archivo no debe superar los 5MB');
          return false;
        }

        return file;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.openDialogEnviar();
        const file = result.value;

        const formData = new FormData();
        formData.append('archivo', file);
        formData.append('idIngreso', this.ingresoForm.value.idIngreso);// this.ingresoForm.value.idIngreso);
        this.acuerdoservicioService.completarAcuerdoServicio(formData).subscribe((res: any) => {

          setTimeout(() => {
            this.closeDialog();
            Swal.fire({
              icon: 'success',
              title: '¡Éxito!',
              text: 'Acuerdo de Servicio completado correctamente!',
              confirmButtonText: 'OK',
              allowOutsideClick: false,
              allowEscapeKey: false,
              allowEnterKey: true,
              showCloseButton: false
            }).then((result) => {
              if (result.isConfirmed) {
                this.router.navigate(['/home/acserv/seguimiento']);
              }
            });
          }, 1500);
        }, (error: any) => {
          this.closeDialog();
          this.toastrService.error('ERROR', 'No se pudo completar el acuerdo de servicio!');
        });
      }
    });
  }
  openDialogEnviar() {
    Swal.fire({
      title: 'Espere!',
      text: 'Subiendo...',
      imageWidth: 400,
      imageHeight: 250,
      imageUrl: 'assets/images/enviando.gif',
      timerProgressBar: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false
    });
    Swal.showLoading();
  }

  closeDialog() {
    Swal.hideLoading();
    Swal.close();
  }
  async cargarDatosAcuerdo(): Promise<void> {
    this.loadingService.showLoading();
    try {
      const res: any = await this.acuerdoservicioService.obtenerDatosAcuerdobyId(this.idIngreso);
      if (!res?.data) {
        this.toastrService.error('ERROR', 'No se pudo obtener la información del acuerdo.');
        return;
      }
      const datos = res.data;
      this.ingresoForm.patchValue({
        idIngreso: datos.id,
        idEstado: datos.idEstado,
        idResponsable: datos.idResponsable,
        ramo: datos.ramo ?? datos.idRamo ?? this.ingresoForm.value.ramo,
        cliente: datos.cliente,
        ruc: datos.ruc,
        direccion: datos.direccion,
        ciudad: datos.ciudad,
        telefono: datos.telefono,
        correoCliente: datos.correoCliente ?? datos.emailCliente ?? datos.correo ?? '',
        contacto: datos.contactoPrincipal,
        inicioVigencia: datos.inicioVigencia,
        finVigencia: datos.finVigencia,
        aseguradora: datos.idAseguradora
      });
      this.lstContactos = Array.isArray(datos.contactos) ? datos.contactos : [];
      this.lstContactos.forEach((element: any) => {
        element.idCargo = element.idCargo ?? element.cargo;
        element.nombreCargo = element.nombreCargo ??
          this.lstCargos.find((x: any) => x.id == element.idCargo)?.nombre;
      });
      this.lstBeneficios = Array.isArray(datos.beneficios) ? datos.beneficios : [];
      this.lstValoresAgregados = Array.isArray(datos.valoresAgregados)
        ? datos.valoresAgregados.map((valor: any) => this.sinFechaValor(valor)) : [];
      // En edición/completar, el backend puede devolver una sola lista de SLA
      // con su campo "tipo" ("Operaciones" o "Siniestros"). Separarla antes
      // de mostrar las dos tablas impide que Operaciones aparezca en Siniestros.
      const slasGuardados = datos.lstSLAS ?? datos.slas ?? datos.SLAS;
      const operacionesGuardadas = datos.lstSLASOperaciones ?? datos.slasOperaciones ?? datos.slas_operaciones;
      const tieneListaGuardada = Array.isArray(slasGuardados);
      const tieneOperacionesSeparadas = Array.isArray(operacionesGuardadas);

      if (tieneListaGuardada) {
        const todosLosSLAS = this.normalizarSLAS(slasGuardados);
        this.lstSLAS = todosLosSLAS.filter((sla: any) => !this.esSLAOperaciones(sla.tipo));
        this.lstSLASOperaciones = todosLosSLAS.filter((sla: any) => this.esSLAOperaciones(sla.tipo));
      }

      // Compatibilidad con respuestas que envían Operaciones por separado.
      // En ese caso, la lista explícita prevalece y no se duplica.
      if (tieneOperacionesSeparadas) {
        this.lstSLASOperaciones = this.normalizarSLAS(operacionesGuardadas, 'Operaciones');
      }

      // Solo consultar SLA predeterminados cuando NO se recibió una lista
      // de SLA guardados. Una lista vacía también es un dato válido.
      if (!tieneListaGuardada) {
        this.cargarSLASPorRamo(false, tieneOperacionesSeparadas);
      }
    } catch (error) {
      this.toastrService.error('ERROR', 'No se pudo cargar el acuerdo de servicio.');
    } finally {
      this.loadingService.hideLoading();
    }
  }

  abrirModalValor(): void {
    this.cerrarModal();
    this.modalActivo = 'valor';
  }

  agregarValor(): void {
    if (this.agregadosForm.invalid) {
      this.agregadosForm.markAllAsTouched();
      this.toastrService.error('ERROR', 'Complete los datos del valor agregado.');
      return;
    }
    this.lstValoresAgregados.push({ ...this.agregadosForm.value });
    this.cerrarModal();
    this.toastrService.success('Correcto', 'Valor agregado registrado.');
  }

  indexAgregado: number | null = null;

  editarValor(index: number): void {
    const item = this.lstValoresAgregados[index];
    if (!item) return;
    this.abrirModalValor();
    this.indexAgregado = index;
    this.esEdicionValor = true;
    this.agregadosForm.patchValue(item);
  }

  actualizarValor(): void {
    if (this.indexAgregado === null || !this.lstValoresAgregados[this.indexAgregado] || this.agregadosForm.invalid) {
      this.agregadosForm.markAllAsTouched();
      this.toastrService.error('ERROR', 'Revise los datos del valor agregado.');
      return;
    }
    this.lstValoresAgregados[this.indexAgregado] = this.sinFechaValor({
      ...this.lstValoresAgregados[this.indexAgregado], ...this.agregadosForm.value
    });
    this.cerrarModal();
    this.toastrService.success('Correcto', 'Valor agregado actualizado.');
  }

  cancelarValor(): void { this.cerrarModal(); }

  eliminarValor(index: number): void {
    this.lstValoresAgregados.splice(index, 1);
    if (this.modalActivo === 'valor') this.cerrarModal();
  }

  // Para valores agregados, la fecha ya no forma parte del registro.
  private sinFechaValor(valor: any): any {
    const { fechaCumplimiento, ...datosValor } = valor ?? {};
    return datosValor;
  }

  onRamoChange(): void {
    this.cerrarModal();
    this.lstSLAS = [];
    this.lstSLASOperaciones = [];
    this.cargarSLASPorRamo();
  }
  onResponsableChange(){

    if(this.ingresoForm.value.idResponsable==3){
      this.ingresoForm.patchValue({
        ramo:2
      });
    }
        if(this.ingresoForm.value.idResponsable==3){
      this.ingresoForm.patchValue({
        ramo:3
      });
    }
    this.onRamoChange();
  }
  validarRangoFechas(control: AbstractControl): ValidationErrors | null {
    const inicio = control.get('inicioVigencia')?.value;
    const fin = control.get('finVigencia')?.value;
    return inicio && fin && fin <= inicio ? { fechaInvalida: true } : null;
  }
}