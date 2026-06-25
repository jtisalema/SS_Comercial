import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { ChecklistService } from 'src/app/services/checklist.service';
import { LoadingService } from 'src/app/services/loading.service';
import * as SpanishLanguage from 'src/assets/Spanish.json';
import { ToastrService } from 'src/app/services/toastr.service';
import * as XLSX from 'xlsx';
declare var $: any;
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
@Component({
  selector: 'app-chlseguimiento',
  templateUrl: './chlseguimiento.component.html',
  styleUrls: ['./chlseguimiento.component.css']
})
export class ChlseguimientoComponent {
  @ViewChild('dataTableIngresos', { static: false }) tableIngresos!: ElementRef;
  lstIngresos: any = [];
  dtOptions: any;
  dataTable: any;
  userCurrent: any;
  esEjecutivo: boolean = false;
  idEjecutivo: any;
  esComercial: boolean = false;
  idComercial: any;
  constructor(private checklistService: ChecklistService, private loadingService: LoadingService,
    private toastrService: ToastrService, private router: Router, private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {

  }
  async ngOnInit() {
    this.userCurrent = await this.authService.getUserInfor();
    if (this.userCurrent.idRol == 29) {
      this.idEjecutivo = this.userCurrent.id;
      this.esEjecutivo = true;
    }
    if (this.userCurrent.idRol == 18) {
      this.idComercial = this.userCurrent.id;
      this.esComercial = true;
    }
    (window as any).revisarIngreso = this.revisarIngreso.bind(this);
    (window as any).estimarEntrega = this.estimarEntrega.bind(this);
    (window as any).visualizarIngreso = this.visualizarIngreso.bind(this);
    (window as any).abrirModalHistorialMovimientos = this.abrirModalHistorialMovimientos.bind(this);

    this.consultarIngresos();
  }
  consultarIngresos() {
    this.loadingService.showLoading();
    this.checklistService.obtenerIngresosCheckList().subscribe((res: any) => {
      this.lstIngresos = res.data;
      //Filtro personalizado
      $.fn.dataTable.ext.search.push(
        (settings: any, data: any, dataIndex: any) => {

          // 🔹 Solo aplicar si esEjecutivo es verdadero
          //if (!this.esEjecutivo) return true;

          const checked = ($('#chkEstadoFiltro') as any).prop('checked');

          if (!checked) return true;

          const rowData = settings.aoData[dataIndex]._aData;
          if (this.esEjecutivo) {
            const estado = Number(rowData.idEjecutivo);
            return [this.idEjecutivo].includes(estado);
          } else if (this.esComercial) {
            const estado = Number(rowData.idComercial);
            return [this.idComercial].includes(estado);
          } else {
            return true;
          }

        }
      );
      const self = this;

      // 🔥 FILTRO GLOBAL (ROJO / AMARILLO)
      $.fn.dataTable.ext.search.push((settings: any, data: any, dataIndex: any) => {

        const row = settings.aoData[dataIndex]._aData;
        console.log('row', row);
        const chkRojo = ($('#chkRojo') as any).prop('checked');
        const chkAmarillo = ($('#chkAmarillo') as any).prop('checked');

        if (!chkRojo && !chkAmarillo) return true;

        if (!row.fechaMaxima) return true;

        const hoy = new Date();
        const fechaMaxima = new Date((row.fechaMaxima + '').replace(' ', 'T'));

        hoy.setHours(0, 0, 0, 0);
        fechaMaxima.setHours(0, 0, 0, 0);

        const estado = Number(row.idEstado);

        const esRojo = ((row.fechaUltMov > row.fechaMaxima) && (row.idEstado != 1));
        const esAmarillo = (hoy >= fechaMaxima && (estado === 4 || estado === 9));
        if (chkRojo && !chkAmarillo) return esRojo;
        if (chkAmarillo && !chkRojo) return esAmarillo;
        if (chkRojo && chkAmarillo) return esRojo || esAmarillo;

        return true;
      });
      // 🔥 FILTRO SIN CERRADOS
      $.fn.dataTable.ext.search.push((settings: any, data: any, dataIndex: any) => {

        const row = settings.aoData[dataIndex]._aData;

        const chkSinCerrados = ($('#chkSinCerrados') as any).prop('checked');

        // si el check está desactivado → mostrar todo
        if (!chkSinCerrados) return true;

        // ocultar idEstado = 10
        return Number(row.idEstado) !== 10;
      });
      this.dtOptions = {
        data: this.lstIngresos,
        info: false,
        pageLength: 7,
        lengthChange: false,
        language: {
          ...this.GetSpanishLanguage()
        },

        // 🔥 PINTADO DE FILAS
        rowCallback: function (row: any, data: any) {

          $(row).find('td').css('background-color', '');

          if (!data.fechaMaxima) return;
          console.log(row, ' ', data);
          const hoy = new Date();
          const fechaMaxima = new Date((data.fechaMaxima + '').replace(' ', 'T'));

          hoy.setHours(0, 0, 0, 0);
          fechaMaxima.setHours(0, 0, 0, 0);

          const estado = Number(data.idEstado);

          if (hoy >= fechaMaxima) {
            if (estado == 4 || estado == 9) {
              $(row).find('td').css('background-color', '#fff9b2'); // 🟡
            }
          }
          if ((data.fechaUltMov > data.fechaMaxima) && (data.idEstado != 1)) {
            $(row).find('td').css('background-color', '#f8d7da'); // 🔴
          }
        },

        // 🔥 UI CONTROLES
        initComplete: function () {

          let mensaje = 'Mis Registros';
          if (self.esEjecutivo) {
            mensaje = 'Mis Asignaciones';
          }

          const api = this.api();

          setTimeout(() => {

            const checkbox = `
<div id="filtrosExtras" class="d-flex flex-wrap align-items-center gap-3">

    <div class="d-flex align-items-center">
        <input type="checkbox" id="chkEstadoFiltro" class="me-1" checked>
        <label class="mb-0" for="chkEstadoFiltro">
            ${mensaje}
        </label>
    </div>

    <div class="d-flex align-items-center">
        <input type="checkbox" id="chkSinCerrados" class="me-1" checked>
        <label class="mb-0" for="chkSinCerrados">
            Sin Cerrados
        </label>
    </div>

    <div class="d-flex align-items-center">
        <input type="checkbox" id="chkRojo" class="me-1">
        <label class="mb-0 text-danger" for="chkRojo">
            ● Atrasado
        </label>
    </div>

    <div class="d-flex align-items-center">
        <input type="checkbox" id="chkAmarillo" class="me-1">
        <label class="mb-0 text-warning" for="chkAmarillo">
            ● Pendiente
        </label>
    </div>

</div>
`;

            const filter = $(api.table().container()).find('.dataTables_filter');
            $(api.table().container())
              .find('.dataTables_filter')
              .parent()
              .removeClass('col-md-6')
              .addClass('col-md-12');
            // Crear barra superior si no existe
            if (!$('#toolbarFiltros').length) {

              filter.before(`
    <div id="toolbarFiltros"
         style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            flex-wrap:nowrap;
            gap:15px;
            margin-bottom:10px;
            width:100%;
         ">
    </div>
`);

              $('#toolbarFiltros').append(checkbox);

              // mover buscador dentro de la barra
              $('#toolbarFiltros').append(filter);
              // 🔥 FILTROS
              $('#filtrosExtras').css({
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                flexWrap: 'nowrap',
                whiteSpace: 'nowrap',
                flex: '0 0 auto'
              });

              // 🔥 BUSCADOR
              filter.css({
                display: 'flex',
                alignItems: 'center',
                width: 'auto',
                margin: '0px',
                float: 'none',
                whiteSpace: 'nowrap'
              });

              // 🔥 LABEL
              filter.find('label').css({
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                margin: '0px',
                whiteSpace: 'nowrap'
              });

              // 🔥 INPUT
              filter.find('input').css({
                width: '15vw',
                maxWidth: '180px',
                minWidth: '120px'
              });

            }

            // evita que el buscador se expanda raro
            filter.css({
              margin: 0,
              whiteSpace: 'nowrap'
            });

            const drawTable = () => api.draw();

            $('#chkEstadoFiltro').on('change', drawTable);
            $('#chkRojo').on('change', drawTable);
            $('#chkAmarillo').on('change', drawTable);
            $('#chkSinCerrados').on('change', drawTable);
            api.draw();

          }, 0);
        },

        columns: [

          // 🔥 ORDEN (prioridad interna)
          {
            data: null,
            visible: false,
            render: function (data: any, type: any, row: any) {

              if (type === 'sort') {

                if (!row.fechaMaxima) return 0;

                const hoy = new Date();
                const fechaMaxima = new Date((row.fechaMaxima + '').replace(' ', 'T'));

                hoy.setHours(0, 0, 0, 0);
                fechaMaxima.setHours(0, 0, 0, 0);

                const estado = Number(row.idEstado);

                if (hoy >= fechaMaxima && estado === 2) return 1;

                return 0;
              }

              return '';
            }
          },

          { title: 'N°', data: 'id' },

          //   {
          //     title: 'Prioridad / Gestión',
          //     data: null,
          //     render: function (data: any, type: any, row: any) {

          //       let icono = '';
          //       let color = '';

          //       switch (row.prioridad) {
          //         case 'ALTA': icono = '↑'; color = 'red'; break;
          //         case 'MEDIA': icono = '='; color = 'orange'; break;
          //         case 'BAJA': icono = '↓'; color = 'green'; break;
          //         default: icono = '?';
          //       }

          //       let tipo = row.tipoGestion == 1
          //         ? 'Emisión Póliza nueva'
          //         : row.tipoGestion == 2
          //           ? 'Ingreso Póliza nueva'
          //           : row.tipoGestion == 3
          //             ? 'Renovación de póliza'
          //             : 'Sin definir';
          //       return `
          //   <div style="font-size:11px">
          //     <div style="color:${color}">
          //       ${icono} <strong>${row.prioridad}</strong>
          //     </div>
          //     <div>${tipo}</div>
          //   </div>
          // `;
          //     }
          //   },

          {
            title: '<i class="fas fa-cogs me-1"></i> Opción',
            searchable: false,
            render: (data: any, type: any, full: any) => {

              let botones = '';

              if ((full.idEstado != 3) && this.esEjecutivo) {
                botones += `<button title="Revisar" class="btn btn-primary btn-sm" onclick="revisarIngreso(${full.id})"><i class="fas fa-edit"></i></button>`;
              }

              if (full.idEstado == 3 && !this.esEjecutivo) {
                botones += `<button title="Revisar" class="btn btn-primary btn-sm" onclick="revisarIngreso(${full.id})"><i class="fas fa-edit"></i></button>`;
              }

              botones += `<button title="Seguimiento" class="btn btn-success btn-sm" onclick="abrirModalHistorialMovimientos(${full.id})"><i class="fas fa-search"></i></button>`;

              if (full.idEstado == 1 && !this.esEjecutivo) {
                botones += `<button title="Revisar" class="btn btn-warning btn-sm" onclick="revisarIngreso(${full.id})"><i class="fas fa-edit"></i></button>`;
              }

              if (this.esEjecutivo) {
                botones += `<button title="Estimar Entrega" class="btn btn-secondary btn-sm" onclick="estimarEntrega(${full.id})"><i class="fas fa-flag"></i></button>`;
              }
              if (full.idEstado != 1) {
                botones += `<button title="Visualizar" class="btn btn-info btn-sm" onclick="visualizarIngreso(${full.id})"><i class="fas fa-eye"></i></button>`;
              }
              return `<div class="d-flex justify-content-center flex-nowrap" style="gap:5px">${botones}</div>`;
            }
          },

          { title: 'Estado', data: 'estado' },
          { title: 'F.Registro', data: 'fechaRegistro' },
          { title: 'F.Est.Entr.', data: 'fechaMaxima' },
          {
            title: 'F.Abierto.',
            data: 'fechaAbierto',
            render: (data: any) => {
              return data || '-';
            }
          },
          { title: 'F.Ultimo.Mov.', data: 'fechaUltMov' },
          { title: 'Cliente', data: 'cliente' },
          { title: 'Ramos', data: 'lstRamos' },
          { title: 'Aseguradora', data: 'aseguradora' },
          { title: 'Solicitante', data: 'solicitante' },
          { title: 'Ejecutivo', data: 'ejecutivo' }

        ],

        order: [
          [0, 'desc'],
          [1, 'desc']
        ],

        responsive: false,
        autoWidth: false,
        scrollX: true,
      };
      this.dataTable = $(this.tableIngresos.nativeElement);
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
  revisarIngreso(idIngreso: any) {
    let formd = new FormData();
    formd.append('idEjecutivo', this.userCurrent.id);
    formd.append('idIngreso', idIngreso);
    if (this.esEjecutivo) {
      this.checklistService.cambiarEstadoRevisado(formd).subscribe((res: any) => {
        this.router.navigate(['/home/checkList/ingreso', res.data]);
      }, (error: any) => {
        this.toastrService.error('ERROR', 'Error al actualizar el estado!');
      });
    } else {
      this.router.navigate(['/home/checkList/ingreso', idIngreso]);
    }
  }
  registroSeleccionado: any = '';
  tiempoOcupado: any = '';
  fechaEstimada: any = '';
  lstMovimientosRegistro: any = [];
  abrirModalHistorialMovimientos(idRegistro: any) {
    this.registroSeleccionado = idRegistro;
    this.lstMovimientosRegistro = [];
    this.checklistService.obtenerMovimientosRegistro(idRegistro).subscribe((res: any) => {
      this.lstMovimientosRegistro = res.data;
      this.fechaEstimada = res.fechaEstimada;
      this.tiempoOcupado = res.tiempoOcupado;
      $('#contactoModal').modal('show');
      this.cdr.detectChanges();
    }, (error: any) => {
      this.loadingService.hideLoading();
      this.toastrService.error('ERROR', 'No se pudo obtener los movimientos!');
    });

  }
  estimarEntrega(idIngreso: any) {
    Swal.fire({
      title: 'Fecha estimada para la entrega',
      html: `
    <div class="d-flex flex-column gap-3 align-items-center justify-content-center" style="text-align:center;">
      <input type="datetime-local" id="fechaEntrega" class="form-control" style="width:80%;text-align:center" placeholder="Selecciona fecha y hora">

      <label for="observacion" class="form-label fw-bold">Observaciones / Razón de la entrega</label>
      <textarea id="observacion" class="form-control" style="width:80%; resize:none;text-align:center" placeholder="Ingresa una observación"></textarea>
    </div>
  `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      allowOutsideClick: false, // ❌ no cerrar al click fuera
      preConfirm: () => {
        const popup = Swal.getPopup();
        if (!popup) {
          Swal.showValidationMessage('Error: no se encontró el popup');
          return false;
        }

        const fechaInput = popup.querySelector<HTMLInputElement>('#fechaEntrega');
        const obsInput = popup.querySelector<HTMLTextAreaElement>('#observacion');

        if (!fechaInput || !obsInput) {
          Swal.showValidationMessage('Error al obtener los campos');
          return false;
        }

        const fecha = fechaInput.value;
        const obs = obsInput.value;

        if (!fecha || !obs) {
          Swal.showValidationMessage('Ambos campos son obligatorios');
          return false;
        }

        return { fecha, observacion: obs };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.openDialogEnviar();
        let formD = new FormData();
        formD.append('idIngreso', idIngreso);
        formD.append('fechaEstimada', result.value.fecha);
        formD.append('idEjecutivo', this.userCurrent.id);
        formD.append('observacion', result.value.observacion);

        this.checklistService.ingresarEntregaEstimada(formD).subscribe((res: any) => {
          this.closeDialog();
          Swal.fire({
            icon: 'success',
            title: '¡Éxito!',
            text: 'Fecha de Entrega Ingresada Correctamente',
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            allowEscapeKey: false,
            allowEnterKey: true,
            showCloseButton: false
          }).then((result) => {
            if (result.isConfirmed) {
              window.location.reload();
            }
          });
        }, (error: any) => {
          this.closeDialog();
          this.toastrService.error('ERROR', 'No se pudo guardar el movimiento!');
        });
      }
    });
  }
  visualizarIngreso(idIngreso: any) {
    let visualizar = 1;
    this.router.navigate(['/home/checkList/ingreso', idIngreso, visualizar]);
  }
  openDialogEnviar() {
    Swal.fire({
      title: 'Espere!',
      text: 'Enviando...',
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
  exportar() {

    const table = $('#tablaseg').DataTable();

    // Guardar cantidad actual de registros por página
    const paginaActual = table.page.len();

    // Mostrar todos los registros
    table.page.len(-1).draw();

    setTimeout(() => {

      const element = document.getElementById('tablaseg');

      if (element) {

        const ws: XLSX.WorkSheet =
          XLSX.utils.table_to_sheet(element);

        const wb: XLSX.WorkBook =
          XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
          wb,
          ws,
          'Registros'
        );

        XLSX.writeFile(
          wb,
          'registrosChk.xlsx'
        );
      }

      // Restaurar paginación original
      table.page.len(paginaActual).draw();

    }, 300);

  }
}
