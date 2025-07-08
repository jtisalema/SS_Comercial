import { Component, ElementRef, ViewChild } from '@angular/core';
import { LoadingService } from 'src/app/services/loading.service';
import { ssempleados } from 'src/app/models/ss-empleados';
import * as SpanishLanguage from 'src/assets/Spanish.json';
import { ToastrService } from 'src/app/services/toastr.service';

@Component({
  selector: 'app-personal',
  templateUrl: './personal.component.html',
  styleUrls: ['./personal.component.css']
})
export class PersonalComponent {
  @ViewChild('dataTablePersonal', { static: false }) tablePersonal!: ElementRef;
    constructor(private loadingService: LoadingService,
      private toastrService:ToastrService
    ) { }
  //variables
  isEditing: boolean = false;
  lstPersonal:ssempleados[]=[];
  dtOptions: any;
  dataTable: any;

  ngOnInit(): void {

  }
  async CargarListadoPersonal() {
    try {
      this.loadingService.showLoading();

      //this.lstCustodios = await this.custodiosService.obtenerCustodios();

      if (this.lstPersonal.length > 0)
      this.dtOptions = {
        data: this.lstPersonal,
        info: false,
        language: {
          ...this.GetSpanishLanguage()
        },
        columns: [
          { title: 'Id.', data: 'idCustodio' },
          { title: 'Sucursal', data: 'sucursal.descripcionSucursal' },
          { title: 'Identificación', data: 'identificacion' },
          { title: 'Apellidos y Nombres', data: 'nombreApellidoCustodio' },
          {
            targets: -2,
            searchable: false,
            render: function (data: any, type: any, full: any, meta: any) {
              return `<button type="button" class="btn btn-primary btn-sm" onclick="EditarCustodio(${full.idCustodio})"><i class="fas fa-edit"></i></button>`;
            },
            className: 'text-center btn-acciones-column'
          },
          {
            targets: -1,
            orderable: false,
            searchable: false,
            render: function (data: any, type: any, full: any, meta: any) {
              return `<button type="button" class="btn btn-danger btn-sm" onclick="EliminarCustodio(${full.idCustodio})"><i class="fas fa-trash-alt"></i></button>`;
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
      this.dataTable = $(this.tablePersonal.nativeElement);
      this.dataTable.DataTable(this.dtOptions);
    } catch (error) {
      if (error instanceof Error) {
        this.toastrService.error('Error al obtener los custodios', error.message);
      } else {
        this.toastrService.error('Error al obtener los custodios', 'Solicitar soporte al departamento de TI.');
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
