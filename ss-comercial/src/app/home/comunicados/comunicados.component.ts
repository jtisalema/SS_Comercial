import { Component, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { comunicadosService } from 'src/app/services/comunicados.service';
import { LoadingService } from 'src/app/services/loading.service';
import * as SpanishLanguage from 'src/assets/Spanish.json';
import { ToastrService } from 'src/app/services/toastr.service';
declare var $: any;

@Component({
  selector: 'app-comunicados',
  templateUrl: './comunicados.component.html',
  styleUrls: ['./comunicados.component.css']
})
export class ComunicadosComponent {
  @ViewChild('dataTableComunicados', { static: false }) tableComunicados!: ElementRef;
    constructor(private loadingService: LoadingService,private fb: FormBuilder,private el: ElementRef,
        private renderer: Renderer2, private comunicadosService:comunicadosService, private toastrService:ToastrService
      ) { }
  //variables
  isEditing: boolean = false;
  comunicadoForm!: FormGroup;
  tipoCom: any = 0;
  lstComunicados:any[]=[];
  dtOptions: any;
  dataTable: any;

  ngOnInit() {
    this.InicializarInformacionForm();
    this.cargarListadoComunicados();
    const body = this.el.nativeElement.ownerDocument.body;
    this.renderer.setStyle(body, 'overflow', '');
    // const body = this.el.nativeElement.ownerDocument.body;
    // this.renderer.setStyle(body, 'overflow', '');
  }

  async cargarListadoComunicados(){
    try {
      this.loadingService.showLoading();
      this.lstComunicados = await this.comunicadosService.obtenerComunicados();
      console.log(this.lstComunicados);
      if (this.lstComunicados.length > 0){
      this.dtOptions = {
        data: this.lstComunicados,
        info: false,
        language: {
          ...this.GetSpanishLanguage()
        },
        columns: [
          { title: 'Titulo', data: 'titulo' },
          { title: 'Descripción', data: 'descripcion' },
          { title: 'Mensaje', data: 'mensaje' },
          { title: 'Tipo', data: 'tipo' },
          { title: 'Color', data: 'color' },
          {
            targets: -2,
            searchable: false,
            render: function (data: any, type: any, full: any, meta: any) {
              return `<button type="button" class="btn btn-primary btn-sm" onclick="EditarCustodio(${full.id})"><i class="fas fa-edit"></i></button>`;
            },
            className: 'text-center btn-acciones-column'
          },
          {
            targets: -1,
            orderable: false,
            searchable: false,
            render: function (data: any, type: any, full: any, meta: any) {
              return `<button type="button" class="btn btn-danger btn-sm" onclick="EliminarCustodio(${full.id})"><i class="fas fa-trash-alt"></i></button>`;
            },
            className: 'text-center btn-acciones-column'
          }
        ],
        columnDefs: [
          {
            targets: [4, 5],
            orderable: false,
            searchable: false,
            width: '50px'
          }
        ],
        responsive: false,
        autoWidth: false,
        scrollX: true,
      };
      console.log('this.tableComunicados',this.tableComunicados);
      this.dataTable = $(this.tableComunicados.nativeElement);
      this.dataTable.DataTable(this.dtOptions);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.toastrService.error('Error al obtener datos del personal', error.message);
      } else {
        this.toastrService.error('Error al obtener datos del personal ', 'Solicitar soporte al departamento de TI.');
      }
    } finally {
      this.loadingService.hideLoading();
    }
  }

  InicializarInformacionForm() {
    this.comunicadoForm = this.fb.group({
      tituloComunicado: ['', [Validators.required, Validators.maxLength(300)]],
      descripcionComunicado: ['', [Validators.required, Validators.maxLength(300)]],
      mensajeComunicado: ['', [Validators.maxLength(300)]],
      tipoComunicado: [null, [Validators.required]],
      imagenComunicado: ['',[Validators.required]],
      colorComunicado: ['#000000', Validators.required],
    });
  }
  nombreImagen: string | null = null;
  estaArrastrando: boolean = false;

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    this.setFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.estaArrastrando = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.estaArrastrando = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.estaArrastrando = false;

    if (event.dataTransfer?.files.length) {
      const file = event.dataTransfer.files[0];
      this.setFile(file);
    }
  }

  setFile(file: File): void {
    if (file && file.type.startsWith('image/')) {
      this.nombreImagen = file.name;
      this.comunicadoForm.patchValue({ imagenComunicado: file });
      this.comunicadoForm.get('imagenComunicado')!.markAsTouched();
    }
  }
  onColorChange(event: any): void {
    const color = event.target.value;
    this.comunicadoForm.patchValue({ colorComunicado: color });
    this.comunicadoForm.get('colorComunicado')?.markAsTouched();
  }
  GetSpanishLanguage() {
    return SpanishLanguage;
  }
  AbrirModal(esEdicion: boolean) {
    this.isEditing = esEdicion;
    if (!esEdicion) {
      //this.CrearCustodioForm();
    }
    $('#comunicadoModal').modal('show');
  }

  guardarComunicado() {
    if (this.isEditing) {
      this.actualizarComunicado();
    } else {
      this.crearComunicado();
    }
  }
  actualizarComunicado(){
    console.log('actualizarComunicado');
  }
  crearComunicado(){
    if (this.comunicadoForm.valid) {
    console.log('crearComunicado',this.comunicadoForm.value);
    }else{
          console.log('error debe ingresar todos los campos obligatorios');
    }
  }
}
