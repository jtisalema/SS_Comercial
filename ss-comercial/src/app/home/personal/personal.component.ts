import { Component, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { LoadingService } from 'src/app/services/loading.service';
import { ssempleados } from 'src/app/models/ss-empleados';
import * as SpanishLanguage from 'src/assets/Spanish.json';
import { ToastrService } from 'src/app/services/toastr.service';
import { PersonalService } from 'src/app/services/personal.service';

declare var $: any;

@Component({
  selector: 'app-personal',
  templateUrl: './personal.component.html',
  styleUrls: ['./personal.component.css']
})
export class PersonalComponent {
  @ViewChild('dataTablePersonal', { static: false }) tablePersonal!: ElementRef;

    constructor(private loadingService: LoadingService,
      private toastrService:ToastrService, private personalService:PersonalService,
      private el: ElementRef,
      private renderer: Renderer2,
    ) { }
  //variables
  isEditing: boolean = false;
  lstPersonal:any[]=[];
  dtOptions: any;
  dataTable: any;

  ngOnInit(): void {
    this.CargarListadoPersonal();
    const body = this.el.nativeElement.ownerDocument.body;
    this.renderer.setStyle(body, 'overflow', '');
  }

  async CargarListadoPersonal() {
    try {
      this.loadingService.showLoading();
      this.lstPersonal = await this.personalService.obtenerEmpleados();
      if (this.lstPersonal.length > 0)
      this.dtOptions = {
        data: this.lstPersonal,
        info: false,
        language: {
          ...this.GetSpanishLanguage()
        },
        columns: [
          { title: 'Cédula', data: 'cedula' },
          { title: 'Nombre', data: 'nombre' },
          { title: 'Apellido', data: 'apellido' },
          { title: 'Teléfono', data: 'telefono' },
          { title: 'Email', data: 'email' },
          { title: 'Sucursal', data: 'sucursal' },
          { title: 'Departamento', data: 'nombre_departamento' },
          {
            targets: -2,
            searchable: false,
            render: function (data: any, type: any, full: any, meta: any) {
              return `<button type="button" class="btn btn-primary btn-sm" onclick="EditarCustodio(${full.cedula})"><i class="fas fa-edit"></i></button>`;
            },
            className: 'text-center btn-acciones-column'
          },
          {
            targets: -1,
            orderable: false,
            searchable: false,
            render: function (data: any, type: any, full: any, meta: any) {
              return `<button type="button" class="btn btn-danger btn-sm" onclick="EliminarCustodio(${full.cedula})"><i class="fas fa-trash-alt"></i></button>`;
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
      console.log('this.tablePersonal',this.tablePersonal);
      this.dataTable = $(this.tablePersonal.nativeElement);
      this.dataTable.DataTable(this.dtOptions);
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

  AbrirModal(esEdicion: boolean) {
    this.isEditing = esEdicion;
    if (!esEdicion) {
      //this.CrearCustodioForm();
    }
    //$('#custodioModal').modal('show');
  }
  GetSpanishLanguage() {
    return SpanishLanguage;
  }
}
