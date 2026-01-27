import { Component, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppComponent } from 'src/app/app.component';
import { LoadingService } from 'src/app/services/loading.service';
import { ToastrService } from 'src/app/services/toastr.service';
import * as SpanishLanguage from 'src/assets/Spanish.json';
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
    private appComponent: AppComponent
  ) { }
  //variables
  ingresoForm!: FormGroup;
  contactoForm!: FormGroup;
  isEditing: boolean = false;
  lstContactos: any = [{
    identificacion: '123123',
    cargo: 'cargo',
    nombre: 'nombre',
    fechaNacimiento: '2025-06-01',
    email: 'abcd@gmail.com',
    regalo: 'SI',
    tipoContacto: 'ASISTENTE',
    usuarioWeb: 'NO',
  }];
  lstAseguradoras:any=[{id:1,nombre:'AIG'},{id:2,nombre:'Zurich'}];
  lstRamos:any=[{id:1,nombre:'VIDA'},{id:2,nombre:'AM'},{id:3,nombre:'DESG'},{id:4,nombre:'MASIVOS'}];
  lstGruposContratante:any=[{id:1,nombre:'GRUPO 1'},{id:2,nombre:'GRUPO 2'}];
  lstSucursalesDB:any=[{id:1,nombre:'SDB 1'},{id:2,nombre:'SDB 2'}];
  ngOnInit(): void {
    this.InicializarInformacionForm();
  }
  OnSubmit() {
    console.log('onsubmit');
  }
  InicializarInformacionForm() {
    this.ingresoForm = this.fb.group({
      tipo: ['', Validators.required],
      aseguradora: ['', Validators.required],
      sucursalAseguradora: ['', Validators.required],
      ramo: ['', Validators.required],
      identificacion: ['', Validators.required],
      cliente: ['', Validators.required],
      direccion: ['', Validators.required],
      ciudad: ['', Validators.required],
      subagente: ['', Validators.required],
      grupoContratante: ['', Validators.required],
      subArea: ['', Validators.required],
      sucursalDB: ['', Validators.required],
      comision: ['', Validators.required],
      tasa: ['', Validators.required],
      formaPago: ['', Validators.required],
      cuotas: ['', Validators.required],
      fechaPago: ['', Validators.required],
      pagador: ['0', Validators.required],
      identificacionPagador: ['', Validators.required],
      pagadorSuarez: ['', Validators.required],
    });
    this.contactoForm = this.fb.group({
      identificacion: ['', Validators.required],
      cargo: ['', Validators.required],
      nombre: ['', Validators.required],
      fechaNacimiento: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      regalo: ['NO', Validators.required],        // 0 = No (default)
      tipoContacto: ['', Validators.required],
      usuarioWeb: ['NO', Validators.required],    // 0 = No (default)
    });
  }
  AbrirModalContacto(esEdicion: boolean) {
    this.isEditing = esEdicion;
          this.contactoForm.reset({
        regalo: 'NO',     
        usuarioWeb: 'NO',  
        tipoContacto: '',  
      });
    if (!esEdicion) {
      // this.CrearMarcaForm();
    }
    $('#contactoModal').modal('show');
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
        let contacto = {
          identificacion: this.contactoForm.value.identificacion,
          cargo: this.contactoForm.value.cargo,
          nombre: this.contactoForm.value.nombre,
          fechaNacimiento: this.contactoForm.value.fechaNacimiento,
          email: this.contactoForm.value.email,
          regalo: this.contactoForm.value.regalo,
          tipoContacto: this.contactoForm.value.tipoContacto,
          usuarioWeb: this.contactoForm.value.usuarioWeb,
        }
        this.lstContactos.push(contacto);
        this.contactoForm.reset({
          regalo: 'NO',     
          usuarioWeb: 'NO',  
          tipoContacto: '',  
        });
        this.toastrService.success(
          'Correcto!',
          'Contacto agregado correctamente.'
        );
        console.log('contacto', this.lstContactos);
      } else {
        this.appComponent.validateAllFormFields(this.contactoForm);
        this.toastrService.error(
          'Error al agregar el contacto',
          'No se llenaron todos los campos necesarios.'
        );
        let marca = this.contactoForm.get('identificacion')?.value;
        if (marca.trim().length === 0) {
          this.toastrService.error(
            'Error al guardar el contacto',
            'El número de identificación del contacto no puede estar vacío o contener solo espacios.'
          );
          return;
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        this.toastrService.error('Error al agregar la marca', error.message);
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
    $('#contactoModal').modal('show');
    // this.lstContactos.splice(this.indexEditar, 1);
            let contacto = {
          identificacion: this.contactoForm.value.identificacion,
          cargo: this.contactoForm.value.cargo,
          nombre: this.contactoForm.value.nombre,
          fechaNacimiento: this.contactoForm.value.fechaNacimiento,
          email: this.contactoForm.value.email,
          regalo: this.contactoForm.value.regalo,
          tipoContacto: this.contactoForm.value.tipoContacto,
          usuarioWeb: this.contactoForm.value.usuarioWeb,
        }
      this.lstContactos[this.indexEditar] = contacto;
        this.contactoForm.reset({
          regalo: 'NO',     
          usuarioWeb: 'NO',  
          tipoContacto: '',  
        });
        this.toastrService.success(
          'Correcto!',
          'Contacto agregado correctamente.'
        );
  }
  eliminarContacto(i: any) {
    this.lstContactos.splice(i, 1);
  }
  indexEditar:any;
  editarContacto(i: any) {
    this.isEditing = true;
    this.indexEditar = i;
    let editcontacto = this.lstContactos[i];
    console.log('editcontacto', editcontacto);
    this.contactoForm.patchValue({
      identificacion: editcontacto.identificacion,
      cargo: editcontacto.cargo,
      nombre: editcontacto.nombre,
      fechaNacimiento: editcontacto.fechaNacimiento,
      email: editcontacto.email,
      regalo: editcontacto.regalo,        // 0 = No (default)
      tipoContacto: editcontacto.tipoContacto,
      usuarioWeb: editcontacto.usuarioWeb,    // 0 = No (default)
    });
    $('#contactoModal').modal('show');

  }
  cerrarModalContacto() {
    $('#contactoModal').modal('hide');
  }
}
