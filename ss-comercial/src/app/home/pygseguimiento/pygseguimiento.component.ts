import { Component, ElementRef, ViewChild } from '@angular/core';
import { LoadingService } from 'src/app/services/loading.service';
import { PygService } from 'src/app/services/pyg.service';
import * as SpanishLanguage from 'src/assets/Spanish.json';
import { ToastrService } from 'src/app/services/toastr.service';
import { Router } from '@angular/router';
declare var $: any;

@Component({
  selector: 'app-pygseguimiento',
  templateUrl: './pygseguimiento.component.html',
  styleUrls: ['./pygseguimiento.component.css']
})
export class PygseguimientoComponent {
  constructor(private pygService: PygService,
    private loadingService: LoadingService,
    private toastrService: ToastrService, private router: Router
  ) {

  }
    @ViewChild('dataTableRegistros', { static: false }) tableRegistros!: ElementRef;
  lstRegistros: any = [];
    dtOptions: any;
  dataTable: any;
  userCurrent: any;

  ngOnInit(): void {
    (window as any).visualizarRegistro = this.visualizarRegistro.bind(this);
    this.consultarRegistrosPYG();
  }
  consultarRegistrosPYG() {
    this.loadingService.showLoading();
   this.pygService.obtenerRegistrosPYG().subscribe((res:any)=>{
      this.lstRegistros = res.data;
      console.log('this.lstRegistros',this.lstRegistros);
      //Filtro personalizado
      const self = this;

      this.dtOptions = {
        data: this.lstRegistros,
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
            title: '<i class="fas fa-hashtag me-1"></i> Cliente',
            data: 'cliente'
          },
                    {
            title: '<i class="fas fa-hashtag me-1"></i> F.Registro',
            data: 'fechaRegistro'
          },
                              {
            title: '<i class="fas fa-hashtag me-1"></i> Ramos',
            data: 'ramosTexto'
          },

          {
            title: '<i class="fas fa-cogs me-1"></i> Opción',
            searchable: false,
            render: (data: any, type: any, full: any) => {

              let botones = '';
              botones += `<button title="Visualizar" class="btn btn-info btn-sm" onclick="visualizarRegistro(${full.id})"><i class="fas fa-eye"></i></button>`;

              return `<div class="d-flex justify-content-center flex-nowrap" style="gap:5px">${botones}</div>`;
            }
          },

        ],

        order: [[0, 'desc']],
        responsive: false,
        autoWidth: false,
        scrollX: true,
      };
      this.dataTable = $(this.tableRegistros.nativeElement);
      this.dataTable.DataTable(this.dtOptions);
      this.loadingService.hideLoading();
    }, (error: any) => {
      this.loadingService.hideLoading();
      this.toastrService.error('ERROR', 'No se pudo obtener los registros!');
    });
  }
  visualizarRegistro(item:any){
    console.log('visualizarRegistro',item);
    this.router.navigate(['/home/pyg/ingreso2', item]);
  }
  GetSpanishLanguage() {
    return SpanishLanguage;
  }
}
