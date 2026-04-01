import { Component, ElementRef, ViewChild } from '@angular/core';
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
      private acuerdoservicioService:AcuerdoservicioService,
      private toastrService: ToastrService,
      private authService: AuthService
    ) { }
    @ViewChild('dataTableAcuerdos', { static: false }) tableAcuerdos!: ElementRef;
    lstAcuerdos : any=[];
    dtOptions: any;
dataTable: any;
userCurrent: any;
  async ngOnInit() {
    this.userCurrent = await this.authService.getUserInfor();
    this.consultarIngresos();
  }
  consultarIngresos() {
    this.loadingService.showLoading();
    this.acuerdoservicioService.obtenerAcuerdosServicio().subscribe((res: any) => {
      this.lstAcuerdos = res.data;
      console.log('this.lstAcuerdos',this.lstAcuerdos);
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
