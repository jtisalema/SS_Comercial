import { Component, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AppComponent } from 'src/app/app.component';
import { AuthService } from 'src/app/services/auth.service';
import { ChecklistService } from 'src/app/services/checklist.service';
import { LoadingService } from 'src/app/services/loading.service';
import { ToastrService } from 'src/app/services/toastr.service';
import * as SpanishLanguage from 'src/assets/Spanish.json';
import { environment } from 'src/environments/environment';

import Swal from 'sweetalert2';
declare var $: any;

@Component({
  selector: 'app-chlingreso',
  templateUrl: './chlingreso.component.html',
  styleUrls: ['./chlingreso.component.css']
})
export class ChlingresoComponent {

  constructor(private fb: FormBuilder,
    private loadingService: LoadingService,
    private toastrService: ToastrService,
    private appComponent: AppComponent,
    private checklistService: ChecklistService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }
  //variables
  ingresoForm!: FormGroup;
  contactoForm!: FormGroup;
  isEditing: boolean = false;
  userCurrent: any;
  lstContactos: any = [];
  lstAseguradoras: any = [];
  lstRamos: any = [];
  lstGruposContratante: any = [];
  lstSucursalesDB: any = [];
  lstSubagentes: any = [];
  lstSubareas: any = [];
  lstRequisitos: any = [];
  lstPrioridades: any = [{ id: 1, nombre: 'Alta' }, { id: 2, nombre: 'Media' }, { id: 3, nombre: 'Baja' }];
  lstTipoRegalo: any = [{ id: 0, nombre: 'No Aplica' }, { id: 1, nombre: 'Jefes - Gerentes' }, { id: 2, nombre: 'Mando Medios' }, { id: 3, nombre: 'Ejecutivos' }];
  lstAreas: any = [];
  lstEjecutivos: any = [];
  lstTipoContacto: any = [];
  lstSubareasTodo: any = [];
  files: File[] = [];
  filesRequisitos: File[] = [];
  requisitosSeleccionados: any[] = [];
  esInfoDbroker: boolean = false;
  idIngreso: any;
  esEjecutivo: boolean = false;
  lstRamosTexto: any = [
    { id: 54, nombre: 'Accidentes Personales', control: 'textoAP' },
    { id: 8, nombre: 'Responsabilidad Civil', control: 'textoRC' },
    { id: 14, nombre: 'Todo Riesgo Construcción', control: 'textoTRC' }
  ];
  lstFormaPago: any = [
    { id: 1, nombre: 'Contado/Transferencia' },
    { id: 2, nombre: 'Crédito' },
    { id: 3, nombre: 'Tarjeta de Crédito' },
    { id: 4, nombre: 'Débito Bancario' }
  ];
  lstRamosTextoSeleccionados: any = [];

  ngOnInit(): void {

    if (this.route.snapshot.paramMap.get("id")) {
      this.idIngreso = this.route.snapshot.paramMap.get("id");
    }
    this.obtenerUsuario();
    this.InicializarInformacionForm();
  }

  async obtenerUsuario() {
    this.userCurrent = await this.authService.getUserInfor();
    if (this.userCurrent.idRol == 29) {
      this.esEjecutivo = true;
    }
    this.obtenerInformacionCombos();
    if (this.idIngreso) {
      this.cargarDatosIngreso();
    }
  }
  InicializarInformacionForm() {
    this.ingresoForm = this.fb.group({
      id: [''],
      estado: [''],
      prioridad: [3, Validators.required],
      aseguradora: [null, Validators.required],
      sucursalAseguradora: ['', Validators.required],
      ramo: [[], Validators.required],
      identificacion: ['', Validators.required],
      cliente: ['', Validators.required],
      direccion: ['', Validators.required],
      ciudad: ['', Validators.required],
      subagente: [null, Validators.required],
      grupoContratante: [null, Validators.required],
      area: ['', Validators.required],
      ejecutivoRecibe: ['', Validators.required],
      subArea: ['', Validators.required],
      esSponsor: [false],
      sucursalDB: ['', Validators.required],
      comision: [''],
      tasa: [{ value: '', disabled: true }],

      tipoPrima: ['', Validators.required],
      hur: [''],
      primaRiesgo: [''],
      primaNeta: [''],
      comisionBroker: [''],

      formaPago: ['', Validators.required],
      cuotas: [1],
      numeroDias: [0],
      fechaPago: [new Date().toISOString().substring(0, 10)],
      comprobante: [''],
      pagador: [0, Validators.required],
      identificacionPagador: ['', Validators.required],
      fechaRecepcionFactura: [''],
      observacion: [''],
      //INSPECCION
      datosInspeccion: [true],
      nombreContactoInspeccion: [''],
      celularcontactoInspeccion: [''],
      observacionInspeccion: [''],
      //textos
      textoAP: [''],
      textoRC: [''],
      textoTRC: [''],
    });
    this.ingresoForm.get('ramo')?.valueChanges.subscribe(() => {
      this.actualizarValidadoresRamos();
    });
    const diaActual = new Date().getDate();
    const control = this.ingresoForm.get('fechaRecepcionFactura');
    if (diaActual >= 20) {
      control?.setValidators([Validators.required]);
    }
    control?.updateValueAndValidity();

    this.contactoForm = this.fb.group({
      id: [''],
      identificacion: ['', Validators.required],
      cargo: ['', Validators.required],
      nombre: ['', Validators.required],
      fechaNacimiento: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      regalo: [0, Validators.required],
      tipoContacto: ['', Validators.required],
      usuarioWeb: [0, Validators.required],
      celular: [''],
      telefonoTrabajo: [''],
      telefonoConvencional: [''],
    }, {
      validators: this.alMenosUnTelefonoValidator
    });
  }

  alMenosUnTelefonoValidator(group: any) {
    const celular = group.get('celular')?.value;
    const telefonoTrabajo = group.get('telefonoTrabajo')?.value;
    const telefonoConvencional = group.get('telefonoConvencional')?.value;
    if (celular || telefonoTrabajo || telefonoConvencional) {
      return null;
    }
    return { telefonoRequerido: true };
  }

  AbrirModalContacto(esEdicion: boolean) {
    this.isEditing = esEdicion;
    this.contactoForm.reset({
      regalo: 0,
      usuarioWeb: 0,
      tipoContacto: '',
    });
    if (!esEdicion) {
      // this.CrearMarcaForm();
    }
    $('#contactoModal').modal('show');
  }
  AbrirModalCorrecciones() {
    $('#correccionesModal').modal('show');
  }

  GetSpanishLanguage() {
    return SpanishLanguage;
  }
  guardarContacto() {
    if (this.isEditing) {
      this.actualizarContacto();
    } else {
      this.crearContacto();
    }
  }
  async crearContacto() {
    try {
      this.loadingService.showLoading();
      if (this.contactoForm.valid) {
        let nombreContacto = this.lstTipoContacto.find((item: any) => item.id == this.contactoForm.value.tipoContacto);
        let contacto = {
          identificacion: this.contactoForm.value.identificacion,
          cargo: this.contactoForm.value.cargo,
          nombre: this.contactoForm.value.nombre,
          fechaNacimiento: this.contactoForm.value.fechaNacimiento,
          email: this.contactoForm.value.email,
          regalo: this.contactoForm.value.regalo,
          tipoContacto: this.contactoForm.value.tipoContacto,
          nombreContacto: nombreContacto.nombre,
          usuarioWeb: this.contactoForm.value.usuarioWeb,
          //
          celular: this.contactoForm.value.celular,
          telefonoTrabajo: this.contactoForm.value.telefonoTrabajo,
          telefonoConvencional: this.contactoForm.value.telefonoConvencional,
        }
        this.lstContactos.push(contacto);
        this.contactoForm.reset({
          regalo: 0,
          usuarioWeb: 0,
          tipoContacto: '',
        });
        this.toastrService.success(
          'Correcto!',
          'Contacto agregado correctamente.'
        );
      } else {
        this.appComponent.validateAllFormFields(this.contactoForm);
        this.toastrService.error(
          'Error al agregar el contacto',
          'No se llenaron todos los campos necesarios.'
        );
        let identificacion = this.contactoForm.get('identificacion')?.value;
        if (identificacion?.trim().length === 0) {
          this.toastrService.error(
            'Error al guardar el contacto',
            'El número de identificación del contacto no puede estar vacío o contener solo espacios.'
          );
          return;
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        this.toastrService.error('Error al agregar el contacto', error.message);
      } else {
        this.toastrService.error(
          'Error al agregar la marca',
          'Solicitar soporte al departamento de TI.'
        );
      }
    } finally {
      this.loadingService.hideLoading();
    }
  }
  async actualizarContacto() {
    if (this.contactoForm.valid) {
      $('#contactoModal').modal('show');
      // this.lstContactos.splice(this.indexEditar, 1);
      let nombreContacto = this.lstTipoContacto.find((item: any) => item.id == this.contactoForm.value.tipoContacto);
      let contacto = {
        identificacion: this.contactoForm.value.identificacion,
        cargo: this.contactoForm.value.cargo,
        nombre: this.contactoForm.value.nombre,
        fechaNacimiento: this.contactoForm.value.fechaNacimiento,
        email: this.contactoForm.value.email,
        regalo: this.contactoForm.value.regalo,
        tipoContacto: this.contactoForm.value.tipoContacto,
        nombreContacto: nombreContacto.nombre,
        usuarioWeb: this.contactoForm.value.usuarioWeb,
        //
        celular: this.contactoForm.value.celular,
        telefonoTrabajo: this.contactoForm.value.telefonoTrabajo,
        telefonoConvencional: this.contactoForm.value.telefonoConvencional,
      }
      this.lstContactos[this.indexEditar] = contacto;
      this.contactoForm.reset({
        regalo: 0,
        usuarioWeb: 0,
        tipoContacto: '',
      });
      this.toastrService.success(
        'Correcto!',
        'Contacto actualizado correctamente.'
      );
      this.cerrarModalContacto();
    } else {
      this.appComponent.validateAllFormFields(this.contactoForm);
      this.toastrService.error(
        'Error al agregar el contacto',
        'No se llenaron todos los campos necesarios.'
      );
      let identificacion = this.contactoForm.get('identificacion')?.value;
      if (identificacion?.trim().length === 0) {
        this.toastrService.error(
          'Error al guardar el contacto',
          'El número de identificación del contacto no puede estar vacío o contener solo espacios.'
        );
        return;
      }
    }
  }
  eliminarContacto(i: any) {
    this.lstContactos.splice(i, 1);
  }
  duplicarContacto(i: any) {
    const copia = JSON.parse(JSON.stringify(this.lstContactos[i]));
    this.lstContactos.push(copia);
  }
  indexEditar: any;
  editarContacto(i: any) {
    this.isEditing = true;
    this.indexEditar = i;
    let editcontacto = this.lstContactos[i];
    this.contactoForm.patchValue({
      identificacion: editcontacto.identificacion,
      cargo: editcontacto.cargo,
      nombre: editcontacto.nombre,
      fechaNacimiento: editcontacto.fechaNacimiento,
      email: editcontacto.email,
      regalo: editcontacto.regalo,
      tipoContacto: editcontacto.tipoContacto,
      usuarioWeb: editcontacto.usuarioWeb,
      //
      celular: editcontacto.celular,
      telefonoTrabajo: editcontacto.telefonoTrabajo,
      telefonoConvencional: editcontacto.telefonoConvencional,
    });
    $('#contactoModal').modal('show');

  }
  formatearTelefonos(con: any): string {
    return [con.celular, con.telefonoTrabajo, con.telefonoConvencional]
      .filter(x => x)
      .join(', ');
  }
  cerrarModalContacto() {
    $('#contactoModal').modal('hide');
  }
  //Files
  onSelect(event: any) {
    this.files = [];
    event.addedFiles.forEach((file: any) => {
      if (file.size > 4194304) {
        this.toastrService.warning(
          'Aviso',
          "Archivo: " + file.name + " excede el tamaño. Máximo 4MB"
        );
      } else {
        this.files.push(file);
      }
    });
  }
  onRemove(event: any) {
    this.files.splice(this.files.indexOf(event), 1);
  }
  onSelectRequisitos(event: any) {
    event.addedFiles.forEach((file: any) => {
      if (file.size > 4194304) {
        this.toastrService.warning(
          'Aviso',
          "Archivo: " + file.name + " excede el tamaño. Máximo 4MB"
        );
      } else {
        this.filesRequisitos.push(file);
      }
    });
  }
  onRemoveRequisitos(event: any) {
    this.filesRequisitos.splice(this.filesRequisitos.indexOf(event), 1);
  }

  onPagadorChange(value: number) {
    this.ingresoForm.get('identificacionPagador')?.enable();
    if (value == 0) {
      this.ingresoForm.patchValue({
        identificacionPagador: this.ingresoForm.value.identificacion
      });

      const existePYG = this.lstRequisitos.some((x: any) =>
        x.nombre.includes('PYG')
      );
      console.log('existePYG', existePYG);
      if (existePYG) {
        this.lstRequisitos = this.lstRequisitos.filter((x: any) =>
          !x.nombre.includes('PYG')
        );
      }
      console.log('this.lstRequisitos', this.lstRequisitos);
    } else if (value == 1) {
      this.ingresoForm.patchValue({
        identificacionPagador: ""
      });

      const existePYG = this.lstRequisitos.some((x: any) =>
        x.nombre.includes('PYG')
      );
      console.log('existePYG', existePYG);
      if (existePYG) {
        this.lstRequisitos = this.lstRequisitos.filter((x: any) =>
          !x.nombre.includes('PYG')
        );
      }
      console.log('this.lstRequisitos', this.lstRequisitos);
    } else {
      ///si el pagador es Seguros Suarez
      this.ingresoForm.patchValue({
        identificacionPagador: "1891753191001"
      });
      console.log('se agrega el pyg de requisito');
      const existePYG = this.lstRequisitos.some((x: any) =>
        x.nombre.includes('PYG')
      );
      console.log('existePYG', existePYG);
      if (!existePYG) {
        this.lstRequisitos.push({ id: 999, nombre: 'PYG', idsubarea: this.ingresoForm.value?.subArea });
      } else {
        const itemPYG = this.lstRequisitos.find((x: any) =>
          x.nombre.includes('PYG')
        );
        itemPYG['nombre'] = 'PYG';
      }

      this.ingresoForm.get('identificacionPagador')?.disable();
    }
  }
  obtenerInformacionCombos() {
    this.checklistService.obtenerSucursales().subscribe((res: any) => {
      this.lstSucursalesDB = res.resultado;
      this.lstSucursalesDB = this.lstSucursalesDB.filter((item: any) => item.cdCompania != 4); // excluir quito sur
      console.log('this.lstSucursalesDB', this.lstSucursalesDB);
    }, (error: any) => {
      this.toastrService.error('ERROR', 'No se pudo obtener la información de Sucursales!');
    });
    this.checklistService.obtenerAseguradoras().subscribe((res: any) => {
      this.lstAseguradoras = res.resultado;
    }, (error: any) => {
      this.toastrService.error('ERROR', 'No se pudo obtener la información de Aseguradoras!');
    });
    this.checklistService.obtenerAreas().subscribe((res: any) => {
      this.lstAreas = res.resultado;
      this.lstAreas = this.lstAreas.filter(
        (item: any) => item.cdRamGrupo !== 0 && item.cdRamGrupo !== 5
      );
    }, (error: any) => {
      this.toastrService.error('ERROR', 'No se pudo obtener la información de Areas!');
    });
    this.checklistService.obtenerSubareasxRamo().subscribe((res: any) => {
      this.lstSubareasTodo = res.resultado;
    }, (error: any) => {
      this.toastrService.error('ERROR', 'No se pudo obtener la información de Subareas!');
    });
    this.checklistService.obtenerAgentes().subscribe((res: any) => {
      this.lstSubagentes = res.resultado;
      this.lstSubagentes.forEach((element: any) => {
        if (element['tipo']) {
          element['nombreCompleto'] = element['tipo'] + '-' + element['agente'];
        } else {
          element['nombreCompleto'] = element['agente'];
        }

      });
      ///asignar por defecto el agente de usuario
      if (this.userCurrent?.idSubagente) {
        let encontro = this.lstSubagentes.find((item: any) => item.id == this.userCurrent.idSubagente);
        if (encontro) {
          this.ingresoForm.patchValue({
            subagente: encontro.id
          });
        }
      }
    }, (error: any) => {
      this.toastrService.error('ERROR', 'No se pudo obtener la información de Subagentes!');
    });
    this.checklistService.obtenerEjecutivos().subscribe((res: any) => {
      this.lstEjecutivos = res.data;
    }, (error: any) => {
      this.toastrService.error('ERROR', 'No se pudo obtener la información de Ejecutivos!');
    });
    this.checklistService.obtenerGrupoContratane().subscribe((res: any) => {
      this.lstGruposContratante = res.resultado;
    }, (error: any) => {
      this.toastrService.error('ERROR', 'No se pudo obtener la información de Ramos!');
    });
  }
  lstContactosSugeridos: any = [];
  consultarInformacionTitular() {
    if (this.ingresoForm.value.identificacion.length > 4) {
      this.loadingService.showLoading();
      this.checklistService.obtenerClientebyCedula(this.ingresoForm.value.identificacion).subscribe((res: any) => {
        setTimeout(() => {
          this.loadingService.hideLoading();
          this.toastrService.success('Correcto', 'Información obtenida!');
          this.esInfoDbroker = false;
          if (!res.esError) {
            //informacion obtenida del dbroker
            this.esInfoDbroker = true;
            this.ingresoForm.patchValue({
              cliente: res.resultado[0]?.apCliente + ' ' + res.resultado[0]?.nmCliente,
              direccion: res.resultado[0]?.direccion,
              ciudad: res.resultado[0]?.nombreCiudad
            });
            console.log('informacionContactos', res.resultado[0]?.informacionContactos);
            this.lstContactosSugeridos = [];
            if (res.resultado[0]?.informacionContactos.length > 0) {
              res.resultado[0]?.informacionContactos?.forEach((element: any) => {
                console.log('element', element);
                let emailIndividual = '';
                let celularIndividual = '';
                let telefonoTrabajoIndividual = '';
                let telefonoConvencionalIndividual = '';
                let tipoContactabilidad = [{ nombre: 'TELEF - REF.CELULAR', campo: 'celular' }, { nombre: 'CORREO ELECTRONICO', campo: 'email' },
                { nombre: 'TELEF - REF.CONVEN', campo: 'telefonoConvencional' }, { nombre: 'TELEF - OFICINA', campo: 'telefonoTrabajo' },
                { nombre: 'TELEF - DOMICILIO', campo: 'telefonoConvencional' }, { nombre: 'TELEF - CELULAR', campo: 'celular' }
                ];

                element.listaContactos.forEach((contacto: any) => {
                  const match = tipoContactabilidad.find(
                    t => t.nombre === contacto.tipoContacto?.toUpperCase()
                  );

                  if (match) {
                    switch (match.campo) {
                      case 'email':
                        emailIndividual = contacto.valorContacto;
                        break;
                      case 'celular':
                        celularIndividual = contacto.valorContacto;
                        break;
                      case 'telefonoTrabajo':
                        telefonoTrabajoIndividual = contacto.valorContacto;
                        break;
                      case 'telefonoConvencional':
                        telefonoConvencionalIndividual = contacto.valorContacto;
                        break;
                    }
                  }
                });
                let contactoSugerido = {
                  cargo: element.cargoEjecutivo ?? '',
                  nombre: element.nombreEjecutivo ?? '',
                  email: emailIndividual,
                  //
                  celular: celularIndividual,
                  telefonoTrabajo: telefonoTrabajoIndividual,
                  telefonoConvencional: telefonoConvencionalIndividual,
                }
                console.log('contactoSugerido', contactoSugerido);
                this.lstContactosSugeridos.push(contactoSugerido);
              });
            }

            console.log('this.lstContactosSugeridos', this.lstContactosSugeridos);
          } else {
            //si no hay datos consulto en el databook
            let formD = new FormData();
            formD.append('cedula', this.ingresoForm.value.identificacion);
            formD.append('actualizar', '0');
            formD.append('origen', this.userCurrent.get_persona?.nombre + ' ' + this.userCurrent.get_persona?.apellido);
            this.checklistService.getInfoPersona(formD).subscribe((response: any) => {
              this.ingresoForm.patchValue({
                cliente: response.data?.nm ?? '',
                direccion: response.data?.direccion_adicional ?? '',
                ciudad: response.data?.canton_adicional?.nomdivpol ?? ''
              });
            }, (error: any) => {
              this.loadingService.hideLoading();
              this.toastrService.error('ERROR', 'No se pudo consultar la Información!');
            });
          }
        }, 500);
      }, (error: any) => {
        this.loadingService.hideLoading();
        this.toastrService.error('ERROR', 'No se pudo consultar la Información!');
      });
    }
  }
  consultarInformacionContacto() {
    if (this.contactoForm.value.identificacion.length > 4) {
      this.loadingService.showLoading();
      this.checklistService.obtenerClientebyCedula(this.contactoForm.value.identificacion).subscribe((res: any) => {
        setTimeout(() => {
          this.loadingService.hideLoading();
          this.toastrService.success('Correcto', 'Información obtenida!');
          if (!res.esError) {
            this.contactoForm.patchValue({
              nombre: res.resultado[0]?.apCliente + ' ' + res.resultado[0]?.nmCliente,
              fechaNacimiento: res.resultado[0]?.fcNacimiento?.split('T')[0] || null,
              email: res.resultado[0]?.email
            });
          } else {
            //si no hay datos consulto en el databook
            let formD = new FormData();
            formD.append('cedula', this.contactoForm.value.identificacion);
            formD.append('actualizar', '0');
            formD.append('origen', this.userCurrent.get_persona?.nombre + ' ' + this.userCurrent.get_persona?.apellido);
            this.checklistService.getInfoPersona(formD).subscribe((response: any) => {
              this.contactoForm.patchValue({
                nombre: response.data?.nm ?? '',
                fechaNacimiento: response.data?.fcNac ?? '',
                email: response.data?.email1 ?? ''
              });
            }, (error: any) => {
              this.loadingService.hideLoading();
              this.toastrService.error('ERROR', 'No se pudo consultar la Información!');
            });
          }
        }, 500);
      }, (error: any) => {
        this.loadingService.hideLoading();
        this.toastrService.error('ERROR', 'No se pudo consultar la Información!');
      });
    }
  }
  onChangeIdentificacion() {
    this.esInfoDbroker = false;
    this.ingresoForm.patchValue({
      cliente: '',
      direccion: '',
      ciudad: ''
    });
  }
  onChangeIdentificacionContacto() {
    this.contactoForm.patchValue({
      cargo: '',
      nombre: '',
      fechaNacimiento: '',
      email: '',
      regalo: 0,
      tipoContacto: '',
      usuarioWeb: 0
    });
  }
  onChangeSubarea(event: Event) {
    this.lstRequisitos = [];
    this.filesRequisitos = [];
    this.lstContactos = [];
    this.requisitosSeleccionados = [];
    //si es fianzas se habilita tasa y se pone obligatorio
    if (Number((event.target as HTMLSelectElement).value) == 5) {
      this.ingresoForm.patchValue({
        tasa: '',
      });
      this.ingresoForm.get('tasa')?.enable();
      this.ingresoForm.get('tasa')?.setValidators(Validators.required);
      this.ingresoForm.get('tasa')?.updateValueAndValidity();
      this.ingresoForm.get('comision')?.disable();
      this.ingresoForm.get('comision')?.setValidators([]);
      this.ingresoForm.get('comision')?.updateValueAndValidity();

      this.ingresoForm.get('fechaRecepcionFactura')?.disable();
      this.ingresoForm.get('fechaRecepcionFactura')?.setValidators([]);
      this.ingresoForm.get('fechaRecepcionFactura')?.updateValueAndValidity();

      this.lstFormaPago = [
        { id: 1, nombre: 'Contado/Transferencia' },
        { id: 2, nombre: 'Crédito' },
        { id: 3, nombre: 'Tarjeta de Crédito' },
        { id: 4, nombre: 'Débito Bancario' }
      ];
    } else {
      this.ingresoForm.patchValue({
        tasa: '',
      });
      this.ingresoForm.get('tasa')?.disable();
      this.ingresoForm.get('tasa')?.setValidators([]);
      this.ingresoForm.get('tasa')?.updateValueAndValidity();
      this.ingresoForm.get('comision')?.enable();
      this.ingresoForm.get('comision')?.setValidators([]);
      this.ingresoForm.get('comision')?.updateValueAndValidity();
      ///
      this.ingresoForm.get('fechaRecepcionFactura')?.enable();
      const diaActual = new Date().getDate();
      const control = this.contactoForm.get('fechaRecepcionFactura');
      if (diaActual >= 20) {
        control?.setValidators([Validators.required]);
      } else {
        this.ingresoForm.get('fechaRecepcionFactura')?.setValidators([]);
      }
      control?.updateValueAndValidity();
      this.ingresoForm.get('fechaRecepcionFactura')?.updateValueAndValidity();
      ///
      this.ingresoForm.get('fechaRecepcionFactura')?.setValidators(Validators.required);
      this.ingresoForm.get('fechaRecepcionFactura')?.updateValueAndValidity();
      this.lstFormaPago = [
        { id: 1, nombre: 'Contado/Transferencia' },
        { id: 2, nombre: 'Crédito' },
        { id: 3, nombre: 'Tarjeta de Crédito' },
        { id: 4, nombre: 'Débito Bancario' }
      ];
      //si es masivos no va comision especifica
      if (Number((event.target as HTMLSelectElement).value) == 4) {
        this.ingresoForm.get('fechaRecepcionFactura')?.disable();
        this.ingresoForm.get('fechaRecepcionFactura')?.setValidators([]);
        this.ingresoForm.get('fechaRecepcionFactura')?.updateValueAndValidity();

        this.ingresoForm.get('comision')?.disable();
        this.ingresoForm.get('comision')?.setValidators([]);
        this.ingresoForm.get('comision')?.updateValueAndValidity();
        this.lstFormaPago = [
          { id: 1, nombre: 'Contado/Transferencia' },
          { id: 2, nombre: 'Crédito' }
        ];
      }
      if (Number((event.target as HTMLSelectElement).value) == 3) {
        this.ingresoForm.get('fechaRecepcionFactura')?.setValidators([]);
        this.ingresoForm.get('fechaRecepcionFactura')?.updateValueAndValidity();
      }
    }



    //si es generales y corporativos habilitar datos para inspeccion
    if (this.ingresoForm.value.subArea == 4 && this.ingresoForm.value.subArea == 2) {
      this.lstTipoRegalo.push({ id: 4, nombre: 'TOP/VIP' });
    } else {
      this.lstTipoRegalo = this.lstTipoRegalo.filter((x: any) => x.id !== 4);
    }
    if (this.ingresoForm.value.area == 1 && this.ingresoForm.value.subArea == 2) {
      this.ingresoForm.patchValue({
        nombreContactoInspeccion: '',
        celularcontactoInspeccion: '',
        observacionInspeccion: ''

      });
      this.ingresoForm.get('nombreContactoInspeccion')?.enable();
      this.ingresoForm.get('nombreContactoInspeccion')?.setValidators(Validators.required);
      this.ingresoForm.get('nombreContactoInspeccion')?.updateValueAndValidity();
      this.ingresoForm.get('celularcontactoInspeccion')?.enable();
      this.ingresoForm.get('celularcontactoInspeccion')?.setValidators(Validators.required);
      this.ingresoForm.get('celularcontactoInspeccion')?.updateValueAndValidity();

    } else {
      this.ingresoForm.patchValue({
        nombreContactoInspeccion: '',
        celularcontactoInspeccion: '',
        observacionInspeccion: ''
      });
      this.ingresoForm.get('nombreContactoInspeccion')?.setValidators([]);
      this.ingresoForm.get('nombreContactoInspeccion')?.updateValueAndValidity();
      this.ingresoForm.get('celularcontactoInspeccion')?.setValidators([]);
      this.ingresoForm.get('celularcontactoInspeccion')?.updateValueAndValidity();
    }
    //si es masivo o coorporativo comisiones y hur van obligatorios
    //if (Number((event.target as HTMLSelectElement).value) == 2 || Number((event.target as HTMLSelectElement).value) == 4) {
    if (Number((event.target as HTMLSelectElement).value) == 4) {
      this.ingresoForm.get('tipoPrima')?.enable();
      this.ingresoForm.get('tipoPrima')?.setValidators(Validators.required);
      this.ingresoForm.get('tipoPrima')?.updateValueAndValidity();

      this.ingresoForm.get('hur')?.enable();
      this.ingresoForm.get('hur')?.setValidators(Validators.required);
      this.ingresoForm.get('hur')?.updateValueAndValidity();

      this.ingresoForm.get('comisionBroker')?.enable();
      this.ingresoForm.get('comisionBroker')?.setValidators(Validators.required);
      this.ingresoForm.get('comisionBroker')?.updateValueAndValidity();
    } else {
      this.ingresoForm.get('tipoPrima')?.disable();
      this.ingresoForm.get('tipoPrima')?.setValidators([]);
      this.ingresoForm.get('tipoPrima')?.updateValueAndValidity();

      this.ingresoForm.get('hur')?.disable();
      this.ingresoForm.get('hur')?.setValidators([]);
      this.ingresoForm.get('hur')?.updateValueAndValidity();

      this.ingresoForm.get('comisionBroker')?.disable();
      this.ingresoForm.get('comisionBroker')?.setValidators([]);
      this.ingresoForm.get('comisionBroker')?.updateValueAndValidity();
    }
    //
    this.filesRequisitos = [];
    this.requisitosSeleccionados = [];
    this.obtenerTipoContactos(Number((event.target as HTMLSelectElement).value));
    if (Number((event.target as HTMLSelectElement).value) == 4) {
      //if (Number((event.target as HTMLSelectElement).value) == 2 || Number((event.target as HTMLSelectElement).value) == 4) {
      this.ingresoForm.patchValue({
        // comision: '',
        hur: '',
        primaRiesgo: '',
        primaNeta: '',
        comisionBroker: '',
      });
      this.ingresoForm.get('tipoPrima')?.enable();
      this.ingresoForm.get('tipoPrima')?.setValidators(Validators.required);
      this.ingresoForm.get('tipoPrima')?.updateValueAndValidity();

      this.ingresoForm.get('hur')?.setValidators(Validators.required);
      this.ingresoForm.get('hur')?.updateValueAndValidity();

      this.ingresoForm.get('comisionBroker')?.setValidators(Validators.required);
      this.ingresoForm.get('comisionBroker')?.updateValueAndValidity();
    } else {
      this.ingresoForm.patchValue({
        // comision: '',
        hur: '',
        primaRiesgo: '',
        primaNeta: '',
        comisionBroker: '',
      });
      this.ingresoForm.get('tipoPrima')?.disable();
      this.ingresoForm.get('tipoPrima')?.setValidators([]);
      this.ingresoForm.get('tipoPrima')?.updateValueAndValidity();

      this.ingresoForm.get('hur')?.setValidators([]);
      this.ingresoForm.get('hur')?.updateValueAndValidity();
      this.ingresoForm.get('comisionBroker')?.setValidators([]);
      this.ingresoForm.get('comisionBroker')?.updateValueAndValidity();
    }

    this.lstRequisitos = [];
    const value = (event.target as HTMLSelectElement).value;
    let formD = new FormData();
    formD.append('idSubarea', this.ingresoForm.value.subArea);
    formD.append('idAseguradora', this.ingresoForm.value.aseguradora);
    this.checklistService.obtenerRequisitosbySubarea(formD).subscribe((res: any) => {
      console.log('res', res);
      this.lstRequisitos = res.data;
      console.log('this.lstRequisitos', this.lstRequisitos);
      console.log('this.ingresoForm.value.subArea', this.ingresoForm.value.subArea);
    }, (error: any) => {
      this.loadingService.hideLoading();
      this.toastrService.error('ERROR', 'No se pudo consultar la Información!');
    });
    this.obtenerEjecutivoAsignado();
  }
  onChangeSubareaManual(id: Number) {
    //si es fianzas se habilita tasa y se pone obligatorio
    if (id == 5) {
      this.ingresoForm.get('fechaRecepcionFactura')?.setValidators([]);
      this.ingresoForm.get('fechaRecepcionFactura')?.updateValueAndValidity();
    }
    if (id == 5) {
      this.ingresoForm.patchValue({
        tasa: '',
      });
      this.ingresoForm.get('tasa')?.enable();
      this.ingresoForm.get('tasa')?.setValidators(Validators.required);
      this.ingresoForm.get('tasa')?.updateValueAndValidity();
      this.ingresoForm.get('comision')?.disable();
      this.ingresoForm.get('comision')?.setValidators([]);
      this.ingresoForm.get('comision')?.updateValueAndValidity();

      this.ingresoForm.get('fechaRecepcionFactura')?.disable();
      this.ingresoForm.get('fechaRecepcionFactura')?.setValidators([]);
      this.ingresoForm.get('fechaRecepcionFactura')?.updateValueAndValidity();

      this.ingresoForm.get('fechaRecepcionFactura')?.setValidators([]);
      this.ingresoForm.get('fechaRecepcionFactura')?.updateValueAndValidity();
      this.lstFormaPago = [
        { id: 1, nombre: 'Contado/Transferencia' },
        { id: 2, nombre: 'Crédito' },
        { id: 3, nombre: 'Tarjeta de Crédito' },
        { id: 4, nombre: 'Débito Bancario' }
      ];
    } else {
      this.ingresoForm.patchValue({
        tasa: '',
      });
      this.ingresoForm.get('tasa')?.disable();
      this.ingresoForm.get('tasa')?.setValidators([]);
      this.ingresoForm.get('tasa')?.updateValueAndValidity();
      this.ingresoForm.get('comision')?.enable();
      this.ingresoForm.get('comision')?.setValidators([]);
      this.ingresoForm.get('comision')?.updateValueAndValidity();
      ///
      this.ingresoForm.get('fechaRecepcionFactura')?.enable();
      const diaActual = new Date().getDate();
      const control = this.contactoForm.get('fechaRecepcionFactura');
      if (diaActual >= 20) {
        control?.setValidators([Validators.required]);
      } else {
        this.ingresoForm.get('fechaRecepcionFactura')?.setValidators([]);
      }
      control?.updateValueAndValidity();
      this.ingresoForm.get('fechaRecepcionFactura')?.updateValueAndValidity();
      ///
      this.ingresoForm.get('fechaRecepcionFactura')?.setValidators(Validators.required);
      this.ingresoForm.get('fechaRecepcionFactura')?.updateValueAndValidity();
      this.lstFormaPago = [
        { id: 1, nombre: 'Contado/Transferencia' },
        { id: 2, nombre: 'Crédito' },
        { id: 3, nombre: 'Tarjeta de Crédito' },
        { id: 4, nombre: 'Débito Bancario' }
      ];
      //si es masivos no va comision especifica
      if (id == 4) {
        this.ingresoForm.get('comision')?.disable();
        this.ingresoForm.get('comision')?.setValidators([]);
        this.ingresoForm.get('comision')?.updateValueAndValidity();
        this.lstFormaPago = [
          { id: 1, nombre: 'Contado/Transferencia' },
          { id: 2, nombre: 'Crédito' },
        ];
      }
    }
    //si es generales y corporativos habilitar datos para inspeccion
    if (this.ingresoForm.value.subArea == 4 && this.ingresoForm.value.subArea == 2) {
      this.lstTipoRegalo.push({ id: 4, nombre: 'TOP' });
    } else {
      this.lstTipoRegalo = this.lstTipoRegalo.filter((x: any) => x.id !== 4);
    }
    if (this.ingresoForm.value.area == 1 && this.ingresoForm.value.subArea == 2) {
      this.ingresoForm.patchValue({
        nombreContactoInspeccion: '',
        celularcontactoInspeccion: '',
        observacionInspeccion: ''

      });
      this.ingresoForm.get('nombreContactoInspeccion')?.enable();
      this.ingresoForm.get('nombreContactoInspeccion')?.setValidators(Validators.required);
      this.ingresoForm.get('nombreContactoInspeccion')?.updateValueAndValidity();
      this.ingresoForm.get('celularcontactoInspeccion')?.enable();
      this.ingresoForm.get('celularcontactoInspeccion')?.setValidators(Validators.required);
      this.ingresoForm.get('celularcontactoInspeccion')?.updateValueAndValidity();

    } else {
      this.ingresoForm.patchValue({
        nombreContactoInspeccion: '',
        celularcontactoInspeccion: '',
        observacionInspeccion: ''
      });
      this.ingresoForm.get('nombreContactoInspeccion')?.setValidators([]);
      this.ingresoForm.get('nombreContactoInspeccion')?.updateValueAndValidity();
      this.ingresoForm.get('celularcontactoInspeccion')?.setValidators([]);
      this.ingresoForm.get('celularcontactoInspeccion')?.updateValueAndValidity();
    }
    //si es masivo o coorporativo comisiones y hur van obligatorios
    //if (id == 2 || id == 4) {
    if (id == 4) {
      this.ingresoForm.get('tipoPrima')?.enable();
      this.ingresoForm.get('tipoPrima')?.setValidators(Validators.required);
      this.ingresoForm.get('tipoPrima')?.updateValueAndValidity();

      this.ingresoForm.get('hur')?.enable();
      this.ingresoForm.get('hur')?.setValidators(Validators.required);
      this.ingresoForm.get('hur')?.updateValueAndValidity();

      this.ingresoForm.get('comisionBroker')?.enable();
      this.ingresoForm.get('comisionBroker')?.setValidators(Validators.required);
      this.ingresoForm.get('comisionBroker')?.updateValueAndValidity();
    } else {
      this.ingresoForm.get('tipoPrima')?.disable();
      this.ingresoForm.get('tipoPrima')?.setValidators([]);
      this.ingresoForm.get('tipoPrima')?.updateValueAndValidity();

      this.ingresoForm.get('hur')?.disable();
      this.ingresoForm.get('hur')?.setValidators([]);
      this.ingresoForm.get('hur')?.updateValueAndValidity();

      this.ingresoForm.get('comisionBroker')?.disable();
      this.ingresoForm.get('comisionBroker')?.setValidators([]);
      this.ingresoForm.get('comisionBroker')?.updateValueAndValidity();
    }
    //
    this.filesRequisitos = [];
    this.requisitosSeleccionados = [];
    this.obtenerTipoContactos(id);
    if (id == 4) {
      //if (id == 2 || id == 4) {
      this.ingresoForm.patchValue({
        // comision: '',
        hur: '',
        primaRiesgo: '',
        primaNeta: '',
        comisionBroker: '',
      });
      this.ingresoForm.get('tipoPrima')?.enable();
      this.ingresoForm.get('tipoPrima')?.setValidators(Validators.required);
      this.ingresoForm.get('tipoPrima')?.updateValueAndValidity();

      this.ingresoForm.get('hur')?.setValidators(Validators.required);
      this.ingresoForm.get('hur')?.updateValueAndValidity();

      this.ingresoForm.get('comisionBroker')?.setValidators(Validators.required);
      this.ingresoForm.get('comisionBroker')?.updateValueAndValidity();
    } else {
      this.ingresoForm.patchValue({
        // comision: '',
        hur: '',
        primaRiesgo: '',
        primaNeta: '',
        comisionBroker: '',
      });
      this.ingresoForm.get('tipoPrima')?.disable();
      this.ingresoForm.get('tipoPrima')?.setValidators([]);
      this.ingresoForm.get('tipoPrima')?.updateValueAndValidity();

      this.ingresoForm.get('hur')?.setValidators([]);
      this.ingresoForm.get('hur')?.updateValueAndValidity();

      this.ingresoForm.get('comisionBroker')?.setValidators([]);
      this.ingresoForm.get('comisionBroker')?.updateValueAndValidity();
    }

    this.lstRequisitos = [];
    const value = id;
    let formD = new FormData();
    formD.append('idSubarea', this.ingresoForm.value.subArea);
    formD.append('idAseguradora', this.ingresoForm.value.aseguradora);
    this.checklistService.obtenerRequisitosbySubarea(formD).subscribe((res: any) => {
      this.lstRequisitos = res.data;
    }, (error: any) => {
      this.loadingService.hideLoading();
      this.toastrService.error('ERROR', 'No se pudo consultar la Información!');
    });
  }
  obtenerTipoContactos(idSubarea: Number) {
    this.checklistService.obtenerTipoContactobySubarea(idSubarea).subscribe((res: any) => {
      this.lstTipoContacto = res.data;
    }, (error: any) => {
      this.loadingService.hideLoading();
      this.toastrService.error('ERROR', 'No se pudo consultar los tipo de contactos!');
    });
  }

  onChangeRequisitos(event: Event, requisito: any) {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      this.requisitosSeleccionados.push(requisito.id);
    } else {
      this.requisitosSeleccionados = this.requisitosSeleccionados
        .filter(r => r !== requisito.id);
    }

    // sincroniza con el form
    this.ingresoForm.get('requisitos')?.setValue(this.requisitosSeleccionados);
  }
  onChangeArea(event: Event) {
    this.lstRequisitos = [];
    this.lstContactos = [];
    this.filesRequisitos = [];
    this.lstRamos = [];
    this.lstRamosTextoSeleccionados = [];
    this.ingresoForm.patchValue({
      ramo: [],
    });
    this.requisitosSeleccionados = [];
    this.lstSubareas = this.lstSubareasTodo.filter(
      (item: any) => item.codigoArea == Number((event.target as HTMLSelectElement).value)
    );
    this.ingresoForm.patchValue({
      subArea: "",
    });
    //obtener los ramos del area seleccionada
    if (Number((event.target as HTMLSelectElement).value) == 3) { // si es fianzas obtengo todos los ramos
      this.checklistService.obtenerRamos().subscribe((res: any) => {
        this.lstRamos = res.resultado;
      }, (error: any) => {
        this.toastrService.error('ERROR', 'No se pudo obtener los ramos!');
      });
    } else {
      this.checklistService.obtenerRamosbyArea(Number((event.target as HTMLSelectElement).value)).subscribe((res: any) => {
        this.lstRamos = res.resultado;
      }, (error: any) => {
        this.toastrService.error('ERROR', 'No se pudo obtener los ramos!');
      });
    }

  }
  onChangeAreaManual(areaId: number) {
    this.lstSubareas = this.lstSubareasTodo.filter(
      (item: any) => item.codigoArea == areaId
    );

    this.ingresoForm.patchValue({ subArea: "" });
    //obtener los ramos del area seleccionada
    if (areaId == 3) {
      this.checklistService.obtenerRamos().subscribe((res: any) => {
        this.lstRamos = res.resultado;
      }, (error: any) => {
        this.toastrService.error('ERROR', 'No se pudo obtener los ramos!');
      });
    } else {
      this.checklistService.obtenerRamosbyArea(areaId).subscribe((res: any) => {
        this.lstRamos = res.resultado;
      }, (error: any) => {
        this.toastrService.error('ERROR', 'No se pudo obtener los ramos!');
      });
    }
  }
  pasarPagador() {
    if (this.ingresoForm.value.pagador == 0) {
      this.ingresoForm.patchValue({
        identificacionPagador: this.ingresoForm.value.identificacion,
      });

    }
  }
  tiempoEntrega: number = 2;
  enviarCheckList() {
    if (this.ingresoForm.invalid) {
      this.appComponent.validateAllFormFields(this.ingresoForm);
      const camposInvalidos = this.obtenerCamposInvalidos();
      console.log('camposinvalidos', camposInvalidos);
      this.toastrService.error(
        'Error al enviar CheckList',
        'No se llenaron todos los campos necesarios.'
      );
      return;
    } else {
      if (this.lstContactos.length < 1) {
        this.toastrService.error(
          'Error al enviar CheckList',
          'Debe Agregar los contactos necesarios.'
        );
        return;
      }
      let contactosValidods = this.validarContactosObligatorios();
      if (!contactosValidods) {
        this.toastrService.error(
          'Error al enviar CheckList',
          'Debe Agregar los contactos obligatorios necesarios.'
        );
        return;
      }
      //comprobante si es fianzas
      if (this.files.length < 1 && this.ingresoForm.value.subArea == 5) {
        this.toastrService.error(
          'Error al enviar CheckList',
          'Debe cargar el comprobante de pago.'
        );
        return;
      }
      //requisitos
      if (this.filesRequisitos.length < 1) {
        this.toastrService.error(
          'Error al enviar CheckList',
          'Debe cargar por lo menos 1 documento.'
        );
        return;
      }
      if (this.requisitosSeleccionados.length < 1) {
        this.toastrService.error(
          'Error al enviar CheckList',
          'Debe Seleccionar los requisitos que esta cargando.'
        );
        return;
      }
      //fin requisitos
      this.loadingService.showLoading();
      let formIngresoData = new FormData();
      formIngresoData.append('id', this.ingresoForm.value.id);
      formIngresoData.append('estado', this.ingresoForm.value.estado);

      formIngresoData.append('prioridad', this.ingresoForm.value.prioridad);
      formIngresoData.append('aseguradora', this.ingresoForm.value.aseguradora);
      formIngresoData.append('sucursalAseguradora', this.ingresoForm.value.sucursalAseguradora);
      formIngresoData.append('ramo', this.ingresoForm.value.ramo);

      formIngresoData.append('identificacion', this.ingresoForm.value.identificacion);
      formIngresoData.append('cliente', this.ingresoForm.value.cliente);
      formIngresoData.append('direccion', this.ingresoForm.value.direccion);
      formIngresoData.append('ciudad', this.ingresoForm.value.ciudad);

      formIngresoData.append('subagente', this.ingresoForm.value.subagente);
      formIngresoData.append('grupoContratante', this.ingresoForm.value.grupoContratante);
      formIngresoData.append('area', this.ingresoForm.value.area);
      formIngresoData.append('subArea', this.ingresoForm.value.subArea);
      formIngresoData.append('esSponsor', this.ingresoForm.value.esSponsor);
      formIngresoData.append('ejecutivoRecibe', this.ingresoForm.value.ejecutivoRecibe);

      formIngresoData.append('sucursalDB', this.ingresoForm.value.sucursalDB);
      formIngresoData.append('comision', this.ingresoForm.value.comision);
      formIngresoData.append('tasa', this.ingresoForm.value.tasa);

      formIngresoData.append('tipoPrima', this.ingresoForm.value.tipoPrima);
      formIngresoData.append('hur', this.ingresoForm.value.hur);
      // formIngresoData.append('primaRiesgo', this.ingresoForm.value.primaRiesgo);
      // formIngresoData.append('primaNeta', this.ingresoForm.value.primaNeta);
      formIngresoData.append('comisionBroker', this.ingresoForm.value.comisionBroker);

      formIngresoData.append('formaPago', this.ingresoForm.value.formaPago);
      formIngresoData.append('pagador', this.ingresoForm.value.pagador);
      formIngresoData.append('identificacionPagador', this.ingresoForm.getRawValue().identificacionPagador);
      formIngresoData.append('fechaRecepcionFactura', this.ingresoForm.value.fechaRecepcionFactura);
      formIngresoData.append('cuotas', this.ingresoForm.value.cuotas);
      formIngresoData.append('fechaPago', this.ingresoForm.value.fechaPago);
      //comprobante
      formIngresoData.append('comprobante', this.files[0]);
      //contactos
      formIngresoData.append('lstContactos', JSON.stringify(this.lstContactos));
      formIngresoData.append('observacion', this.ingresoForm.value.observacion);
      //requisitos
      formIngresoData.append('lstRequisitos', JSON.stringify(this.requisitosSeleccionados));
      formIngresoData.append('idUsuario', this.userCurrent.id);
      //inspeccion
      formIngresoData.append('datosInspeccion', this.ingresoForm.value.datosInspeccion);
      formIngresoData.append('nombreContactoInspeccion', this.ingresoForm.value.nombreContactoInspeccion);
      formIngresoData.append('celularcontactoInspeccion', this.ingresoForm.value.celularcontactoInspeccion);
      formIngresoData.append('observacionInspeccion', this.ingresoForm.value.observacionInspeccion);
      //textos de fianzas
      formIngresoData.append('textoAP', this.ingresoForm.value.textoAP);
      formIngresoData.append('textoRC', this.ingresoForm.value.textoRC);
      formIngresoData.append('textoTRC', this.ingresoForm.value.textoTRC);

      this.filesRequisitos.forEach((file: File, index: number) => {
        formIngresoData.append('file_' + index, file);
      });
      let ejecutivoEncargado = this.lstEjecutivos.find((element: any) => element.id == this.ingresoForm.value.ejecutivoRecibe);
      if (!this.ingresoForm.value.id) {
        this.checklistService.enviarCheckList(formIngresoData).subscribe((res: any) => {
          this.loadingService.hideLoading();
          Swal.fire({
            icon: 'success',
            title: '¡Solicitud ingresada!',
            html: `
              Ejecutivo: <span style="color: red; font-weight: bold;">
                ${ejecutivoEncargado.nombreEjecutivo}
              </span>
              <br>
              Tiempo de Entrega: <span style="color: red; font-weight: bold;">
                ${this.tiempoEntrega} días laborables
              </span>
            `,
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            allowEscapeKey: false,
            allowEnterKey: true,
            showCloseButton: false
          }).then((result) => {
            if (result.isConfirmed) {
              this.router.navigate(['/home/checkList/seguimiento']);
            }
          });
        }, (error: any) => {
          this.loadingService.hideLoading();
          this.toastrService.error('ERROR', 'No se pudo guardar el registro!');
        });
      } else {
        this.checklistService.actualizarCheckList(formIngresoData).subscribe((res: any) => {
          this.loadingService.hideLoading();
          Swal.fire({
            icon: 'success',
            title: '¡Solicitud ingresada!',
            html: `
              Ejecutivo: <span style="color: red; font-weight: bold;">
                ${ejecutivoEncargado.nombreEjecutivo}
              </span>
              <br>
              Tiempo de Entrega: <span style="color: red; font-weight: bold;">
                ${this.tiempoEntrega} días laborables
              </span>
            `,
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            allowEscapeKey: false,
            allowEnterKey: true,
            showCloseButton: false
          }).then((result) => {
            if (result.isConfirmed) {
              this.router.navigate(['/home/checkList/seguimiento']);
            }
          });
        }, (error: any) => {
          this.loadingService.hideLoading();
          this.toastrService.error('ERROR', 'No se pudo actualizar el registro!');
        });
      }

    }
  }
  validarContactosObligatorios(): boolean {
    // Filtrar los tipos obligatorios
    const obligatorios = this.lstTipoContacto.filter((t: any) => t.obligatorio === 1);

    for (const tipo of obligatorios) {
      const count = this.lstContactos.filter((c: any) => c.tipoContacto == tipo.id).length;
      if (count < 1) {
        return false;
      }
    }
    return true;
  }
  onChangeFormaPago(event: any) {
    this.files = [];
    if (Number((event.target as HTMLSelectElement).value) != 1) {

      this.ingresoForm.patchValue({
        cuotas: 1,
        fechaPago: [new Date().toISOString().substring(0, 10)],
      });
      this.ingresoForm.get('fechaPago')?.setValidators(Validators.required);
      this.ingresoForm.get('fechaPago')?.updateValueAndValidity();
      this.ingresoForm.get('cuotas')?.setValidators(Validators.required);
      this.ingresoForm.get('cuotas')?.updateValueAndValidity();
    } else {
      this.ingresoForm.patchValue({
        cuotas: 1,
        fechaPago: [new Date().toISOString().substring(0, 10)],
      });
      this.ingresoForm.get('fechaPago')?.setValidators([]);
      this.ingresoForm.get('fechaPago')?.updateValueAndValidity();
      this.ingresoForm.get('cuotas')?.setValidators([]);
      this.ingresoForm.get('cuotas')?.updateValueAndValidity();
    }
  }
  onChangeFormaPagoManual(id: Number) {
    this.files = [];
    if (id != 1) {
      this.ingresoForm.patchValue({
        cuotas: 1,
        fechaPago: [new Date().toISOString().substring(0, 10)],
      });
      this.ingresoForm.get('fechaPago')?.setValidators(Validators.required);
      this.ingresoForm.get('fechaPago')?.updateValueAndValidity();
      this.ingresoForm.get('cuotas')?.setValidators(Validators.required);
      this.ingresoForm.get('cuotas')?.updateValueAndValidity();
    } else {
      this.ingresoForm.patchValue({
        cuotas: 1,
        fechaPago: [new Date().toISOString().substring(0, 10)],
      });
      this.ingresoForm.get('fechaPago')?.setValidators([]);
      this.ingresoForm.get('fechaPago')?.updateValueAndValidity();
      this.ingresoForm.get('cuotas')?.setValidators([]);
      this.ingresoForm.get('cuotas')?.updateValueAndValidity();
    }
  }
  correccionesRealizar: any = '';
  async cargarDatosIngreso() {
    this.loadingService.showLoading();
    let res = await this.checklistService.obtenerDatosIngresobyId(this.idIngreso);
    let contactos = res.dataContactos;
    let ingreso = res.data;
    const listaRamos = ingreso.ramos ? ingreso.ramos.split(',').map(Number).filter((n: any) => !isNaN(n)) : [];
    this.loadingService.hideLoading();
    this.ingresoForm.patchValue({
      id: ingreso.id,
      estado: ingreso.idEstado,
      prioridad: ingreso.idPrioridad,
      aseguradora: ingreso.idAseguradora,
      sucursalAseguradora: ingreso.sucursalAseguradora,
      ramo: listaRamos,
      identificacion: ingreso.identificacion,
      cliente: ingreso.cliente,
      direccion: ingreso.direccion,
      ciudad: ingreso.ciudad,
      subagente: ingreso.idSubagente,
      grupoContratante: ingreso.idGrupoContratante,
      area: ingreso.idArea,

      sucursalDB: ingreso.idSucursalDB,
      comision: ingreso.comision,
    });
    this.onChangeRamoManual();
    this.onChangeAreaManual(ingreso.idArea);
    this.ingresoForm.patchValue({
      subArea: ingreso.idSubarea,
      pagador: ingreso.idPagador,
      esSponsor: ingreso.esSponsor
    });
    this.onChangeSubareaManual(ingreso.idSubarea);
    this.onChangeFormaPagoManual(ingreso.idformaPago);
    this.ingresoForm.patchValue({
      tasa: ingreso.tasa && ingreso.tasa !== 0 ? ingreso.tasa : '',
      hur: ingreso.hur && ingreso.hur !== 0 ? ingreso.hur : '',
      primaRiesgo: ingreso.comprimariesgo && ingreso.comprimariesgo !== 0 ? ingreso.comprimariesgo : '',
      primaNeta: ingreso.comPrimaneta && ingreso.comPrimaneta !== 0 ? ingreso.comPrimaneta : '',
      comisionBroker: ingreso.comBroker && ingreso.comBroker !== 0 ? ingreso.comBroker : '',
      formaPago: ingreso.idformaPago,
      cuotas: ingreso.numCuotas,
      fechaPago: ingreso.fechaPagoCobro,
      // comprobante: ingreso.ciudad,
      //observacion: ingreso.ultimaObservacion,
      //INSPECCION
      nombreContactoInspeccion: ingreso.nombreInspeccion,
      celularcontactoInspeccion: ingreso.celularInspeccion,
      observacionInspeccion: ingreso.observacionInspeccion,
      ejecutivoRecibe: ingreso.idEjecutivo
    });
    let formTiempo = new FormData();
    formTiempo.append('idArea', this.ingresoForm.value.area);
    formTiempo.append('idSubarea', this.ingresoForm.value.subArea);
    this.tiempoEntrega = 2;
    this.checklistService.obtenerTiempodeEntrega(formTiempo).subscribe((res: any) => {
      this.tiempoEntrega = res.data;
    }, (error: any) => {
      this.tiempoEntrega = 2;
      this.toastrService.error('ERROR', 'No se pudo obtener los días de ingreso!');
    });

    //si es ejecutivo cargo la observacion
    if (this.esEjecutivo) {
      this.ingresoForm.patchValue({
        observacion: ingreso.ultimaObservacion,
      });
    } else {
      if (ingreso.idEstado == 3) {
        this.correccionesRealizar = ingreso.ultimaObservacion;
        this.AbrirModalCorrecciones();
      } else {
        this.ingresoForm.patchValue({
          observacion: ingreso.ultimaObservacion,
        });
      }

    }

    ///ingresarContactos
    this.checklistService.obtenerTipoContactobySubarea(ingreso.idSubarea).subscribe((res: any) => {
      this.lstTipoContacto = res.data;
      contactos.forEach((element: any) => {
        let nombreContacto = this.lstTipoContacto.find((item: any) => item.id == element.tipoContacto);
        let contacto = {
          identificacion: element.identificacion ?? '',
          cargo: element.cargo ?? '',
          nombre: element.nombres ?? '',
          fechaNacimiento: element.fechaNacimiento ?? '',
          email: element.email ?? '',
          regalo: element.regalo ?? 0,
          tipoContacto: element.tipoContacto ?? '',
          nombreContacto: nombreContacto.nombre ?? '',
          usuarioWeb: element.usuarioWeb ?? 0,
          //
          celular: element.celular ?? '',
          telefonoConvencional: nombreContacto.telefonoConvencional ?? '',
          telefonoTrabajo: element.telefonoTrabajo ?? 0,
        }
        console.log('element', element);
        this.lstContactos.push(contacto);
      });
      this.onPagadorChange(ingreso.idPagador);
      console.log('eleent', ingreso);
      this.ingresoForm.patchValue({
        identificacionPagador: ingreso.identificacionPagador,
        fechaRecepcionFactura: ingreso.fechaRecepcionFactura,
        textoAP: ingreso.textoAP ?? '',
        textoRC: ingreso.textoRC ?? '',
        textoTRC: ingreso.textoTRC ?? '',
      });
      console.log('ingreso.requisitosSeleccionados', ingreso.requisitosSeleccionados);
      this.requisitosSeleccionados = ingreso.requisitosSeleccionados ? ingreso.requisitosSeleccionados.split(',').map(Number).filter((n: any) => !isNaN(n)) : [];
      this.cargarFilesRequisitos(ingreso.id);
      //cargar el comprobante si es contado
      if (ingreso.idformaPago == 1) {
        this.cargarFileComprobante(ingreso.id);
      }
      this.actualizarValidadoresRamos();
    }, (error: any) => {
      this.loadingService.hideLoading();
      this.toastrService.error('ERROR', 'No se pudo consultar los tipo de contactos!');
    });


    // this.checklistService.obtenerDatosIngresobyId(this.idIngreso).subscribe((res: any) => {

    // }, () => {
    //   this.loadingService.hideLoading();
    //   this.toastrService.error('ERROR', 'No se pudo consultar la Información!');
    //   this.router.navigate(['/home/checkList/seguimiento']);
    // });
  }
  async descargarArchivo(file: any, event: Event) {
    event.stopPropagation(); // 🔹 evita que se abra el selector
    const blobUrl = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(blobUrl);
  }
  async cargarFilesRequisitos(idEmision: number) {
    try {
      const res = await this.checklistService.getFilesRequisitos(idEmision);
      // Validar que res y res.data existan
      if (!res || !res.data) {
        this.filesRequisitos = [];
        return;
      }

      this.filesRequisitos = [];
      res.data.forEach(f => {
        const byteCharacters = atob(f.blob);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        const file = new File([byteArray], f.name, { type: f.type });

        // Agregar a tu lista de files
        this.filesRequisitos.push(file);
      });
      // for (const f of res.data) {
      //   // crear un "File" vacío solo para ngx-dropzone
      //   //const file = new File([], f.name, { type: f.type });
      //   const file = {name: f.name, type: f.type,url:f.url };
      //   this.filesRequisitos.push(file);
      // }
    } catch (error) {
      this.toastrService.warning('ERROR', 'Error al cargar archivos');
    }
  }
  async cargarFileComprobante(idEmision: number) {
    try {
      const res = await this.checklistService.getFileComprobante(idEmision);
      if (!res || !res.data) {
        this.files = [];
        return;
      }
      this.files = [];
      res.data.forEach(f => {
        const byteCharacters = atob(f.blob);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        const file = new File([byteArray], f.name, { type: f.type });

        // Agregar a tu lista de files
        this.files.push(file);
      });
    } catch (error) {
      this.toastrService.warning('ERROR', 'Error al cargar archivos');
    }
  }
  inspeccionActiva: boolean = false;
  toggleInspeccion(event: any) {
    this.inspeccionActiva = event.target.checked;
    //si es generales y corporativos habilitar datos para inspeccion
    if (this.inspeccionActiva) {
      this.ingresoForm.patchValue({
        nombreContactoInspeccion: '',
        celularcontactoInspeccion: '',
        observacionInspeccion: ''

      });
      this.ingresoForm.get('nombreContactoInspeccion')?.enable();
      this.ingresoForm.get('nombreContactoInspeccion')?.setValidators(Validators.required);
      this.ingresoForm.get('nombreContactoInspeccion')?.updateValueAndValidity();
      this.ingresoForm.get('celularcontactoInspeccion')?.enable();
      this.ingresoForm.get('celularcontactoInspeccion')?.setValidators(Validators.required);
      this.ingresoForm.get('celularcontactoInspeccion')?.updateValueAndValidity();
      this.ingresoForm.get('observacionInspeccion')?.enable();

    } else {
      this.ingresoForm.patchValue({
        nombreContactoInspeccion: '',
        celularcontactoInspeccion: '',
        observacionInspeccion: ''
      });
      this.ingresoForm.get('nombreContactoInspeccion')?.setValidators([]);
      this.ingresoForm.get('nombreContactoInspeccion')?.updateValueAndValidity();
      this.ingresoForm.get('nombreContactoInspeccion')?.disable();
      this.ingresoForm.get('celularcontactoInspeccion')?.setValidators([]);
      this.ingresoForm.get('celularcontactoInspeccion')?.updateValueAndValidity();
      this.ingresoForm.get('celularcontactoInspeccion')?.disable();
      this.ingresoForm.get('observacionInspeccion')?.disable();
    }
  }
  estadoSeleccionado: number = 1;
  accionEjecutivoCheckList() {
    let formd = new FormData();
    formd.append('idIngreso', this.idIngreso);
    formd.append('idEjecutivo', this.userCurrent.id);
    formd.append('estado', this.estadoSeleccionado.toString());
    if (this.estadoSeleccionado == 2) {//corregir
      Swal.fire({
        title: 'Observaciones',
        input: 'textarea',
        inputLabel: 'Ingrese las correcciones a realizar',
        inputPlaceholder: 'Escriba aquí ...',
        inputAttributes: {
          'aria-label': 'Ingrese las correcciones a realizar'
        },
        showCancelButton: true,
        confirmButtonText: 'Aceptar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        inputValidator: (value) => {
          if (!value || value.trim() === '') {
            return 'Las observaciones son obligatorias';
          }
          return null;
        }
      }).then((result) => {
        if (result.isConfirmed) {
          const observacion = result.value;
          formd.append('observacion', observacion);
          this.loadingService.showLoading();
          // Aquí haces lo que necesites (ej: llamar a un servicio)
          this.checklistService.accionEjecutivoCheckList(formd).subscribe((res: any) => {
            this.loadingService.hideLoading();
            Swal.fire({
              icon: 'success',
              title: '¡Éxito!',
              text: 'Observaciones enviadas Correctamente',
              confirmButtonText: 'OK',
              allowOutsideClick: false,
              allowEscapeKey: false,
              allowEnterKey: true,
              showCloseButton: false
            }).then((result) => {
              if (result.isConfirmed) {
                this.router.navigate(['/home/checkList/seguimiento']);
              }
            });
          }, (error: any) => {
            this.loadingService.hideLoading();
            this.toastrService.error('ERROR', 'No se pudo actualizar el estado!');
          });
        }
      });
    }
    if (this.estadoSeleccionado == 3) {//Cancelar
      Swal.fire({
        title: 'Motivo para Cancelar',
        input: 'textarea',
        inputLabel: 'Ingrese el motivo',
        inputPlaceholder: 'Escriba aquí...',
        inputAttributes: {
          'aria-label': 'Ingrese el motivo'
        },
        showCancelButton: true,
        confirmButtonText: 'Aceptar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        inputValidator: (value) => {
          if (!value || value.trim() === '') {
            return 'El motivo es obligatorio';
          }
          return null;
        }
      }).then((result) => {
        if (result.isConfirmed) {
          const observacion = result.value;
          formd.append('observacion', observacion);
          this.loadingService.showLoading();
          // Aquí haces lo que necesites (ej: llamar a un servicio)
          this.checklistService.accionEjecutivoCheckList(formd).subscribe((res: any) => {
            this.loadingService.hideLoading();
            Swal.fire({
              icon: 'success',
              title: '¡Éxito!',
              text: 'Solicitud Cancelada Correctamente',
              confirmButtonText: 'OK',
              allowOutsideClick: false,
              allowEscapeKey: false,
              allowEnterKey: true,
              showCloseButton: false
            }).then((result) => {
              if (result.isConfirmed) {
                this.router.navigate(['/home/checkList/seguimiento']);
              }
            });
          }, (error: any) => {
            this.loadingService.hideLoading();
            this.toastrService.error('ERROR', 'No se pudo actualizar el estado!');
          });

        }
      });
    }
    if (this.estadoSeleccionado == 1) {
      this.loadingService.showLoading();
      this.checklistService.accionEjecutivoCheckList(formd).subscribe((res: any) => {
        this.loadingService.hideLoading();
        Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: 'Solicitud aprobada Correctamente',
          confirmButtonText: 'OK',
          allowOutsideClick: false,
          allowEscapeKey: false,
          allowEnterKey: true,
          showCloseButton: false
        }).then((result) => {
          if (result.isConfirmed) {
            this.router.navigate(['/home/checkList/seguimiento']);
          }
        });
      }, (error: any) => {
        this.loadingService.hideLoading();
        this.toastrService.error('ERROR', 'No se pudo actualizar el estado!');
      });
    }
  }

  onChangeAseguradora(event: any) {
    if (event.id == 90) {
      this.ingresoForm.get('comision')?.setValidators(Validators.required);
      this.ingresoForm.get('comision')?.updateValueAndValidity();
    } else {
      this.ingresoForm.get('comision')?.setValidators([]);
      this.ingresoForm.get('comision')?.updateValueAndValidity();
    }
  }
  mostrarSponsor: boolean = false;
  onChangeRamo(event: any) {
    const numerosBuscados = [1, 6, 72];
    const existe = event.some((ramo: any) => numerosBuscados.includes(ramo.cdRamo));
    if (existe) {
      this.mostrarSponsor = true;
    } else {
      this.mostrarSponsor = false;
    }
    //para agregar las cajas de texto para fianzas
    if (this.ingresoForm.value.area == 3) {
      this.lstRamosTextoSeleccionados = this.lstRamosTexto.filter((ramo: any) => this.ingresoForm.value.ramo.includes(ramo.id));

    }

    this.actualizarValidadoresRamos();
  }
  actualizarValidadoresRamos() {
    const seleccionados = this.ingresoForm.value.ramo;

    this.lstRamosTexto.forEach((ramo: any) => {
      const control = this.ingresoForm.get(ramo.control);
      if (seleccionados.includes(ramo.id) && this.ingresoForm.value.area == 3) {
        control?.setValidators([Validators.required]);
      } else {
        control?.clearValidators();
      }

      control?.updateValueAndValidity();

    });
  }
  onChangeRamoManual() {
    const numerosBuscados = [1, 6, 72];
    const existeAlguno = numerosBuscados.some(num => this.ingresoForm.value.ramo.includes(num));
    if (existeAlguno) {
      this.mostrarSponsor = true;
    } else {
      this.mostrarSponsor = false;
    }
    //para agregar las cajas de texto para fianzas
    if (this.ingresoForm.value.area == 3) {
      this.lstRamosTextoSeleccionados = this.lstRamosTexto.filter((ramo: any) => this.ingresoForm.value.ramo.includes(ramo.id));
    }

  }
  obtenerEjecutivoAsignado() {
    let formd = new FormData();
    formd.append('area', this.ingresoForm.value.area);
    formd.append('subarea', this.ingresoForm.value.subArea);
    formd.append('ramo', this.ingresoForm.value.ramo);
    formd.append('subagente', this.ingresoForm.value.subagente);
    formd.append('sponsor', this.ingresoForm.value.esSponsor);
    this.checklistService.obtenerEjecutivoAsignado(formd).subscribe((res: any) => {
      if (res.data) {
        this.ingresoForm.patchValue({
          ejecutivoRecibe: res.data.idEjecutivo
        });
      } else {
        this.toastrService.warning('Aviso', 'Seleccione el ejecutivo a recibir su solicitud!');
      }

    }, (error: any) => {
      this.loadingService.hideLoading();
      this.toastrService.error('ERROR', 'No se pudo obtener el ejecutivo asignado!');
    });
    let formTiempo = new FormData();
    formTiempo.append('idArea', this.ingresoForm.value.area);
    formTiempo.append('idSubarea', this.ingresoForm.value.subArea);
    this.tiempoEntrega = 2;
    this.checklistService.obtenerTiempodeEntrega(formTiempo).subscribe((res: any) => {
      this.tiempoEntrega = res.data;
      console.log('this.tiempoEntrega', this.tiempoEntrega);
    }, (error: any) => {
      this.tiempoEntrega = 2;
      this.toastrService.error('ERROR', 'No se pudo obtener los días de ingreso!');
    });
  }
  calcularFechaPago() {
    const fechaFactura = this.ingresoForm.value.fechaPago;
    const dias = this.ingresoForm.value.numeroDias;
    // Validar que fechaFactura no sea vacía
    if (!fechaFactura) {
      console.warn('Fecha factura no está definida');
      return;
    }
    // Validar que dias sea un número
    const nDias = Number(dias) || 0;
    // Crear la fecha
    const fecha = new Date(fechaFactura);
    if (isNaN(fecha.getTime())) {
      console.error('Fecha factura inválida:', fechaFactura);
      return;
    }
    fecha.setDate(fecha.getDate() + nDias + 1);
    // Formatear a YYYY-MM-DD para el input type="date"
    const nuevaFecha = fecha.getFullYear() + '-' +
      String(fecha.getMonth() + 1).padStart(2, '0') + '-' +
      String(fecha.getDate()).padStart(2, '0');
    this.ingresoForm.patchValue({ fechaPago: nuevaFecha });
  }
  descargarZip() {
    const id = this.ingresoForm.value.id;
    // Abre el ZIP en otra pestaña, el backend se encarga de descargarlo
    window.open(`${environment.apiUrl}descargarRequisitosZip/${id}`, '_blank');
  }
  existeRamo(id: number): boolean {
    return this.lstRamosTextoSeleccionados?.some((x: any) => x.id === id);
  }
  obtenerCamposInvalidos(): string[] {
    const campos: string[] = [];

    Object.keys(this.ingresoForm.controls).forEach(key => {
      const control = this.ingresoForm.get(key);

      if (control && control.invalid) {
        campos.push(key);
      }
    });

    return campos;
  }

  burbujaSeleccionada(item: any) {
    console.log(item);
    this.contactoForm.patchValue({
      cargo: item.cargo,
      nombre: item.nombre,
      email: item.email,
      //
      celular: item.celular ?? '',
      telefonoTrabajo: item.telefonoTrabajo ?? '',
      telefonoConvencional: item.telefonoConvencional ?? '',
    });
  }
}
