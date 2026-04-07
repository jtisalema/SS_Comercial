import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
      idResponsable: [2],
      cliente: [null, Validators.required],
      ruc: ['', [
        Validators.required,
        Validators.pattern(/^[0-9]{13}$/)
      ]],
      direccion: ['', Validators.required],
      ciudad: ['', Validators.required],
      telefono: ['', Validators.required],
      contacto: ['', Validators.required],
      aseguradora: [null],
      inicioVigencia: [new Date().toISOString().substring(0, 10), Validators.required],
      finVigencia: [
        new Date(new Date().setFullYear(new Date().getFullYear() + 1))
          .toISOString()
          .substring(0, 10),
        Validators.required
      ]
    });
    this.slasForm = this.fb.group({
      id: [''],
      actividad: ['', Validators.required],
      sla: ['', Validators.required],
      consideraciones: ['', [Validators.required, Validators.email]]
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
      cantidadValor: ['', Validators.required],
      detalleValor: ['', Validators.required],
      fechaCumplimiento: ['', Validators.required]
    });
    this.beneficiosForm = this.fb.group({
      nombreBeneficio: ['', Validators.required],
      cantidadBeneficio: ['', Validators.required],
      detalleBeneficio: ['', Validators.required],
      valorBeneficio: ['', Validators.required],
      fechaCumplimiento: ['', Validators.required]
    });
    this.acuerdoservicioService.obtenerContactosIniciales().subscribe((res: any) => {
      this.lstContactos = res.data;
      this.lstBeneficios = res.beneficios;
      this.lstSLAS = res.slas;
      this.lstResponsables = res.responsables;

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
  agregarContacto() {
    if (this.contactoForm.valid) {
      let nombreCargo = this.lstCargos.find((x: any) => x.id == this.contactoForm.value.idCargo)?.nombre;
      let contacto = {
        idCargo: this.contactoForm.value.idCargo,
        nombreCargo: nombreCargo,
        nombre: this.contactoForm.value.nombre,
        correo: this.contactoForm.value.correo,
        celular: this.contactoForm.value.celular
      }
      this.lstContactos.push(contacto);
      this.contactoForm.patchValue({
        idCargo: '',
        nombreCargo: '',
        nombre: null,
        correo: null,
        celular: null
      });
    } else {
      this.contactoForm.markAllAsTouched();

      Object.keys(this.contactoForm.controls).forEach(key => {
        const control = this.contactoForm.get(key);

        if (control?.invalid) {
          console.log(`Campo inválido: ${key}`, control.errors);
        }
      });
      this.appComponent.validateAllFormFields(this.contactoForm);
      this.toastrService.error(
        'Error al agregar el contacto',
        'No se llenaron todos los campos necesarios.'
      );
    }
  }
  agregarSLA() {
    if (this.slasForm.valid) {
      this.lstContactos.push(this.slasForm.value);
      this.slasForm.patchValue({
        id: '',
        actividad: null,
        sla: null,
        consideraciones: null
      });
    } else {
      this.slasForm.markAllAsTouched();
      Object.keys(this.slasForm.controls).forEach(key => {
        const control = this.slasForm.get(key);

        if (control?.invalid) {
          console.log(`Campo inválido: ${key}`, control.errors);
        }
      });
      this.appComponent.validateAllFormFields(this.slasForm);
      this.toastrService.error(
        'Error al agregar el SLA',
        'No se llenaron todos los campos necesarios.'
      );
    }
  }
  indexSLA: any;
  editarSLA(index: number) {
    this.indexSLA = index;
    this.esEdicionSLA = true;
    let editSLA = this.lstSLAS[index];
    let sla ={
      id: editSLA.id,
      actividad: editSLA.actividad,
      sla: editSLA.sla,
      consideraciones: editSLA.consideraciones
    }
    this.slasForm.setValue(sla);
  }
  eliminarSLA(index: number) {
    this.lstSLAS.splice(index, 1);
  }
  actualizarSLA() {
    this.esEdicionSLA = false;
    this.lstSLAS[this.indexSLA] = this.slasForm.value;
    this.slasForm.patchValue({
      id: '',
      actividad: null,
      sla: null,
      consideraciones: null
    });
    this.toastrService.success(
      'Correcto!',
      'SLA actualizado correctamente.'
    );
  }
  cancelarSLA() {
    this.esEdicionSLA = false;
    this.slasForm.patchValue({
      id: '',
      actividad: null,
      sla: null,
      consideraciones: null
    });
  }

  indexContacto: any;
  editarContacto(index: number) {
    this.indexContacto = index;
    this.esEdicionContacto = true;
    let editcontacto = this.lstContactos[index];
    let contacto = {
        idCargo: editcontacto.idCargo,
        nombreCargo: editcontacto.nombreCargo,
        nombre: editcontacto.nombre,
        correo: editcontacto.correo,
        celular: editcontacto.celular
    }
    this.contactoForm.setValue(contacto);
  }
  eliminarContacto(index: number) {
    this.lstContactos.splice(index, 1);
  }
  actualizarContacto() {
    this.esEdicionContacto = false;
    this.lstContactos[this.indexContacto] = this.contactoForm.value;
    this.contactoForm.patchValue({
      idCargo: '',
      nombreCargo: '',
      nombre: null,
      correo: null,
      celular: null
    });
    this.toastrService.success(
      'Correcto!',
      'Contacto actualizado correctamente.'
    );
  }
  cancelarContacto() {
    this.esEdicionContacto = false;
    this.contactoForm.patchValue({
      idCargo: '',
      nombreCargo: '',
      nombre: null,
      correo: null,
      celular: null
    });
  }

  acuerdoGenerado: boolean = false;

  generarAcuerdo() {
    if (this.ingresoForm.valid) {
      if (this.lstBeneficios.length < 1) {
        this.toastrService.warning(
          'Aviso',
          'Debe  Ingresar el detalle de beneficios para el cliente.'
        );
        return;
      }
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
      this.loadingService.showLoading();
      let responsable = this.lstResponsables.find((item: any) => item.id == this.ingresoForm.value.idResponsable);
      let formAcuerdos = {
        responsable: responsable,
        idResponsable: responsable.id,
        idIngreso: this.ingresoForm.value.idIngreso,
        nombreCliente: this.ingresoForm.value.cliente,
        ruc: this.ingresoForm.value.ruc,
        direccion: this.ingresoForm.value.direccion,
        ciudad: this.ingresoForm.value.ciudad,
        telefono: this.ingresoForm.value.telefono,
        contacto: this.ingresoForm.value.contacto,
        lstContactos: this.lstContactos,
        lstBeneficios: this.lstBeneficios,
        lstSLAS: this.lstSLAS,
        lstValoresAgregados: this.lstValoresAgregados,
        inicioVigencia: this.ingresoForm.value.inicioVigencia,
        finVigencia: this.ingresoForm.value.finVigencia,
        idUsuario: this.userCurrent.id,
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
  agregarBeneficio() {
    if (this.beneficiosForm.valid) {
      let beneficio = {
        nombreBeneficio: this.beneficiosForm.value.nombreBeneficio,
        detalleBeneficio: this.beneficiosForm.value.detalleBeneficio,
        valorBeneficio: this.beneficiosForm.value.valorBeneficio,
        cantidadBeneficio: this.beneficiosForm.value.cantidadBeneficio,
        fechaCumplimiento: this.beneficiosForm.value.cantidadBeneficio,
      }
      this.lstBeneficios.push(beneficio);
      this.beneficiosForm.reset();
    } else {
      this.beneficiosForm.markAllAsTouched();

      Object.keys(this.beneficiosForm.controls).forEach(key => {
        const control = this.beneficiosForm.get(key);

        if (control?.invalid) {
          console.log(`Campo inválido: ${key}`, control.errors);
        }
      });
      this.appComponent.validateAllFormFields(this.beneficiosForm);
      this.toastrService.error(
        'Error al agregar el beneficio',
        'No se llenaron todos los campos necesarios.'
      );
    }
  }
  actualizarBeneficio() {
    this.esEdicionBeneficio = false;
    this.lstBeneficios[this.indexBeneficio] = this.beneficiosForm.value;
    this.beneficiosForm.reset();
    this.toastrService.success(
      'Correcto!',
      'Beneficio actualizado correctamente.'
    );
  }
  cancelarBeneficio() {
    this.esEdicionBeneficio = false;
    this.beneficiosForm.reset();
  }
  indexBeneficio: any;
  editarBeneficio(index: any) {
    this.indexBeneficio = index;
    this.esEdicionBeneficio = true;
    let editBeneficio = this.lstBeneficios[index];
    this.beneficiosForm.setValue(editBeneficio);
  }
  eliminarBeneficio(index: any) {
    this.lstBeneficios.splice(index, 1);
  }
  clienteSeleccionado: any;
  onClienteChange(cliente: any) {
    this.clienteSeleccionado = cliente;
    this.ingresoForm.patchValue({
      ruc: this.clienteSeleccionado?.identificacion ?? '',
      direccion: this.clienteSeleccionado?.direccion ?? '',
      ciudad: this.clienteSeleccionado?.ciudad ?? '',
      telefono: this.formatearTelefono(this.clienteSeleccionado?.telefonoMovil)
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
        <i class="fas fa-cloud-upload-alt" style="font-size:28px; color:#0d6efd; margin-bottom:8px;"></i>
        <input type="file" id="fileInput"
            style="font-size:12px;"
            accept=".pdf,.doc,.docx">
    </div>
  `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0d6efd',
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
  async cargarDatosAcuerdo() {
    this.loadingService.showLoading();
    let res = await this.acuerdoservicioService.obtenerDatosAcuerdobyId(this.idIngreso);
    if(res.data){
      let datos = res.data;
    this.ingresoForm.patchValue({
      idIngreso: datos.id,
      idEstado: datos.idEstado,
      idResponsable: datos.idResponsable,
      cliente: datos.cliente,
      ruc: datos.ruc,
      direccion: datos.direccion,
      ciudad: datos.ciudad,
      telefono: datos.telefono,
      contacto: datos.contactoPrincipal,
      inicioVigencia: datos.inicioVigencia,
      finVigencia: datos.finVigencia,
      aseguradora: datos.idAseguradora
    });
    this.lstContactos = datos.contactos;
    this.lstSLAS = datos.slas;

    this.lstContactos.forEach((element:any) => {
      let nombreCargo = this.lstCargos.find((x: any) => x.id == element.cargo)?.nombre;
      element.nombreCargo = nombreCargo;
      element.idCargo = element.cargo;
    });
    this.lstBeneficios = datos.beneficios;
    this.lstValoresAgregados = datos.valoresAgregados;
    }else{
      this.toastrService.error('ERROR', 'No se pudo obtener la información del acuerdo!');
    }

  }
  //valores agregados
    agregarValor() {
    if (this.agregadosForm.valid) {
      let valorAgregado = {
        nombreValor: this.agregadosForm.value.nombreValor,
        detalleValor: this.agregadosForm.value.detalleValor,
        cantidadValor: this.agregadosForm.value.cantidadValor,
        fechaCumplimiento: this.agregadosForm.value.fechaCumplimiento,
      }
      this.lstValoresAgregados.push(valorAgregado);
      this.agregadosForm.reset();
    } else {
      this.agregadosForm.markAllAsTouched();

      Object.keys(this.agregadosForm.controls).forEach(key => {
        const control = this.agregadosForm.get(key);

        if (control?.invalid) {
          console.log(`Campo inválido: ${key}`, control.errors);
        }
      });
      this.appComponent.validateAllFormFields(this.agregadosForm);
      this.toastrService.error(
        'Error al agregar el valor agregado',
        'No se llenaron todos los campos necesarios.'
      );
    }
  }
  actualizarValor() {
    this.esEdicionValor = false;
    this.lstValoresAgregados[this.indexAgregado] = this.agregadosForm.value;
    this.agregadosForm.reset();
    this.toastrService.success(
      'Correcto!',
      'Valor Agregado actualizado correctamente.'
    );
  }
  cancelarValor() {
    this.esEdicionValor = false;
    this.agregadosForm.reset();
  }
  indexAgregado: any;
  editarValor(index: any) {
    this.indexAgregado = index;
    this.esEdicionValor = true;
    let editValor = this.lstValoresAgregados[index];
    this.agregadosForm.setValue(editValor);
  }
  eliminarValor(index: any) {
    this.lstValoresAgregados.splice(index, 1);
  }
}
