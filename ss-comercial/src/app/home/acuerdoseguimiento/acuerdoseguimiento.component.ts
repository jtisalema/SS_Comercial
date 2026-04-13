import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AcuerdoservicioService } from 'src/app/services/acuerdoservicio.service';
import { AuthService } from 'src/app/services/auth.service';
import { LoadingService } from 'src/app/services/loading.service';
import { ToastrService } from 'src/app/services/toastr.service';
declare var $: any;
import * as SpanishLanguage from 'src/assets/Spanish.json';

@Component({
  selector: 'app-acuerdoseguimiento',
  templateUrl: './acuerdoseguimiento.component.html',
  styleUrls: ['./acuerdoseguimiento.component.css']
})
export class AcuerdoseguimientoComponent {
  constructor(private loadingService: LoadingService,
    private acuerdoservicioService: AcuerdoservicioService,
    private toastrService: ToastrService,
    private authService: AuthService,
    private router: Router
  ) { }
  @ViewChild('dataTableAcuerdos', { static: false }) tableAcuerdos!: ElementRef;

  lstAcuerdos: any = [];
  dtOptions: any;
  dataTable: any;
  userCurrent: any;
  async ngOnInit() {
    this.userCurrent = await this.authService.getUserInfor();
    this.consultarIngresos();
    (window as any).revisarAcuerdo = this.revisarAcuerdo.bind(this);
    (window as any).verDocumento = this.verDocumento.bind(this);
    (window as any).seguimientoBeneficios = this.seguimientoBeneficios.bind(this);
  }
  revisarAcuerdo(idAcuerdo: any) {
    this.router.navigate(['/home/acserv/ingreso', idAcuerdo]);
  }
  verDocumento(id: any) {
    let archivoFirmado = this.lstAcuerdos.find((x: any) => x.id == id)?.archivoFirmado;
    const url = `https://cotizador.segurossuarez.com/backend/storage/app/acuerdosServicio/${id}/${archivoFirmado}`;
    window.open(url, '_blank');
  }
  seguimientoBeneficios(id: any) {
    this.router.navigate(['/home/acserv/seguimiento/beneficios/', id]);
  }
  consultarIngresos() {
    this.loadingService.showLoading();
    this.acuerdoservicioService.obtenerAcuerdosServicio().subscribe((res: any) => {
      this.lstAcuerdos = res.data;
      //Filtro personalizado
      const self = this;

      this.dtOptions = {
        data: this.lstAcuerdos,
        info: false,
        pageLength: 7,
        lengthChange: false,
        language: {
          ...this.GetSpanishLanguage()
        },

        columns: [

          {
            title: '<i class="fas fa-hashtag me-1"></i> N°',
            data: 'id'
          },
          // Prioridad
          {
            title: '<i class="fas fa-exclamation-circle me-1 text-danger"></i> Estado',
            data: 'idEstado',
            className: 'text-center',
            render: function (data: string) {

              let clase = 'badge bg-secondary';
              let texto = data;

              if (data == '1') {
                clase = 'badge bg-warning';
                texto = 'Pendiente';
              } else if (data == '2') {
                clase = 'badge bg-success';
                texto = 'Completo';
              }

              return `<span class="${clase} px-2 py-1" style="font-size:10px">${texto}</span>`;
            }
          },
          // Opciones
          {
            title: '<i class="fas fa-cogs me-1"></i> Opción',
            searchable: false,
            render: (data: any, type: any, full: any, meta: any) => {

              let botones = '';

              if (full.idEstado == 1) {
                // Botón revisar
                botones += `
        <button title="Revisar" type="button"
          class="btn btn-primary btn-sm"
          onclick="revisarAcuerdo(${full.id})">
          <i class="fas fa-edit"></i>
        </button>
      `;
              }

              if (full.idEstado != 1) {
                // Botón ver documento
                botones += `
        <button title="Ver documento" type="button"
          class="btn btn-success btn-sm"
          onclick="verDocumento(${full.id})">
          <i class="fas fa-file-alt"></i>
        </button>
      `;
              }
              if (full.idEstado != 1 && this.userCurrent.idRol == 30) {
                botones += `
        <button title="Seguimiento" type="button"
          class="btn btn-warning btn-sm"
          onclick="seguimientoBeneficios(${full.id})">
          <i class="fas fa-search"></i>
        </button>
      `;
              }

              return `<div class="d-flex justify-content-center flex-nowrap" style="gap: 5px;">${botones}</div>`;
            }
          },

          {
            title: '<i class="fas fa-layer-group me-1"></i> Cliente',
            data: 'cliente'
          },

          {
            title: '<i class="fas fa-building me-1"></i> F.Registro',
            data: 'fechaRegistro'
          },

          {
            title: '<i class="fas fa-user-tie me-1"></i> F.Inicio Vigencia',
            data: 'inicioVigencia'
          },

          {
            title: '<i class="fas fa-briefcase me-1"></i> F.Fin Vigencia',
            data: 'finVigencia'
          },
          {
            title: '<i class="fas fa-briefcase me-1"></i> Usuario',
            data: 'usuario'
          }

        ],

        order: [[0, 'desc']],
        responsive: false,
        autoWidth: false,
        scrollX: true,
      };
      this.dataTable = $(this.tableAcuerdos.nativeElement);
      this.dataTable.DataTable(this.dtOptions);
      this.loadingService.hideLoading();
    }, (error: any) => {
      this.loadingService.hideLoading();
      this.toastrService.error('ERROR', 'No se pudo obtener los registros!');
    });
  }
  GetSpanishLanguage() {
    return SpanishLanguage;
  }
}
