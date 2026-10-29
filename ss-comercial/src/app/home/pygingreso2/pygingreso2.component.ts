import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppComponent } from 'src/app/app.component';
import { AuthService } from 'src/app/services/auth.service';
import { ToastrService } from 'src/app/services/toastr.service';
import * as SpanishLanguage from 'src/assets/Spanish.json';
import { Subject } from 'rxjs';
import { debounceTime, switchMap, tap } from 'rxjs/operators';
import { PygService } from 'src/app/services/pyg.service';
import { ChecklistService } from 'src/app/services/checklist.service';
import { LoadingService } from 'src/app/services/loading.service';
import { map } from 'rxjs/operators';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx-js-style';
interface FilaGastoFactura {
  gasto: any | null;
  factura: any | null;
  mostrarGasto: boolean;
}

declare var $: any;
import { ActivatedRoute, Router } from '@angular/router';
@Component({
  selector: 'app-pygingreso2',
  templateUrl: './pygingreso2.component.html',
  styleUrls: ['./pygingreso2.component.css']
})
export class PygingresoComponent2 implements OnDestroy {
  ngOnDestroy(): void {

    if (this.esFinanciero) {
      document.body.classList.remove('sidebar-collapse');
    }

  }
  @ViewChild('dataTableFacturas', { static: false }) tableFacturas!: ElementRef;
  ingresoForm!: FormGroup;
  gastoForm!: FormGroup;
  userCurrent: any;

  // Respaldos temporales para la aprobación de gastos.
  // Se muestran en ngx-dropzone y se asocian al ramo únicamente al confirmar.
  archivosAprobacionTemp: File[] = [];
  registroPendienteAprobacion: any = null;
  porcentajeGastoPendiente: number = 0;
  porcMaxGastoPendiente: number = 0;
  maximoValorGastosPendiente: number = 0;
  readonly maxArchivoAprobacion: number = 20 * 1024 * 1024; // 20 MB por archivo
  // Referencia visual para la barra acumulada. No bloquea la carga total.
  readonly maxTotalVisualAprobacion: number = 100 * 1024 * 1024; // 100 MB
  private resolverAprobacion?: (permitirContinuar: boolean) => void;
  lstGastos: any;
  lstPYG: any;
  idRegistro: any;
  // /:id/1 = consulta exclusiva del registro, sin formulario ni filtros.
  tipoAcceso: string = "";
  modoDetalleRegistro: boolean = false;
  // Revisión de un registro PYG, disponible solo para el usuario autorizado en modo detalle.
  accionRevisionPYG: 'aprobar' | 'corregir' | 'rechazar' = 'aprobar';
  registroRevisionOriginal: any = null;
  guardandoRevisionPYG = false;
  guardandoRegistrosPYG = false;

  // Modal de espera para las peticiones de guardado y revisión a Laravel.
  private mostrarProcesandoPYG(titulo: string, mensaje: string): void {
    Swal.fire({
      title: titulo,
      text: mensaje,
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      showConfirmButton: false,
      showCancelButton: false,
      didOpen: () => Swal.showLoading()
    });
  }

  get puedeRevisarRegistroPYG(): boolean {
    return this.modoDetalleRegistro && Number(this.userCurrent?.id) === 1509
      && !!this.idRegistro && !!this.registroRevisionOriginal;
  }

  async confirmarRevisionPYG(): Promise<void> {
    if (!this.puedeRevisarRegistroPYG || this.guardandoRevisionPYG) return;
    const accion = this.accionRevisionPYG;
    if (!accion) {
      await Swal.fire({
        icon: 'warning', title: 'Seleccione una opción',
        text: 'Debe elegir Aprobar, Corregir o Rechazar.'
      });
      return;
    }

    const titulos = {
      aprobar: 'Aprobar Registro PYG',
      corregir: 'Corregir Registro PYG',
      rechazar: 'Rechazar Registro PYG'
    };
    const comentarioObligatorio = accion !== 'aprobar';
    const descripciones = {
      aprobar: 'Desea ingresar algun comentario para la aprobacion de este registro de PYG',
      corregir: 'Ingrese los cambios que debe realizar en el registro del PYG',
      rechazar: 'Ingrese los comentarios para rechazar este Registro de PYG'
    };
    const resultado = await Swal.fire({
      title: titulos[accion],
      input: 'textarea',
      inputLabel: descripciones[accion],
      inputPlaceholder: comentarioObligatorio ? 'Escriba aquí sus observaciones...' : 'Comentario opcional...',
      inputAttributes: { 'aria-label': 'Comentario de revisión PYG' },
      showCancelButton: true,
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
      icon: accion === 'aprobar' ? 'question' : accion === 'corregir' ? 'info' : 'warning',
      confirmButtonColor: accion === 'rechazar' ? '#dc3545' : accion === 'corregir' ? '#d97706' : '#198754',
      customClass: {
        popup: 'pyg-swal-revision',
        title: 'pyg-swal-revision-titulo',
        input: 'pyg-swal-revision-textarea',
        confirmButton: 'pyg-swal-revision-confirmar',
        cancelButton: 'pyg-swal-revision-cancelar'
      },
      showLoaderOnConfirm: false,
      inputValidator: (valor: string) => {
        if (comentarioObligatorio && !valor?.trim()) {
          return 'El comentario es obligatorio para corregir o rechazar.';
        }
        return null;
      }
    });
    if (!resultado.isConfirmed) return;

    const datosRevision = {
      idRegistro: this.idRegistro,
      idUsuario: this.userCurrent.id,
      accion,
      comentario: String(resultado.value || '').trim(),
      registro: this.registroRevisionOriginal
    };
    const jsonRevision = JSON.stringify(datosRevision);
    // Envío del registro completo como cadena JSON al backend.
    const formD = new FormData();
    formD.append('datosRevision', jsonRevision);
    this.guardandoRevisionPYG = true;
    this.mostrarProcesandoPYG('Procesando revisión', 'Espere mientras se registra su decisión...');
    this.pygService.guardarRevisionPYG(formD).subscribe({
      next: async (res: any) => {
        this.guardandoRevisionPYG = false;
        Swal.close();
        if (res?.ok === false || (res?.status != null && Number(res.status) >= 400)) {
          await Swal.fire({
            icon: 'error', title: 'No se pudo guardar',
            text: res?.mensaje || 'El servidor no confirmó la operación.'
          });
          return;
        }
        this.accionRevisionPYG = 'aprobar';
        await Swal.fire({
          icon: 'success', title: 'Revisión guardada',
          text: res?.mensaje || 'La decisión fue registrada correctamente.'
        });
        // Regresar al seguimiento en la pestaña «Por registro» tras confirmar la revisión.
        await this.router.navigate(['/home/pyg/seguimiento'], {
          queryParams: { vista: 'registros' }
        });
      },
      error: async () => {
        this.guardandoRevisionPYG = false;
        Swal.close();
        await Swal.fire({
          icon: 'error', title: 'Error al guardar',
          text: 'No fue posible enviar la revisión al servidor.'
        });
      }
    });
  }

  clientes: any[] = [];
  clientesInput$ = new Subject<string>();
  loadingClientes = false;
  lstRamos: any = [];
  lstFacturasCliente: any = [];
  dtOptions: any;
  dataTable: any;
  objCliente: any;
  esFinanciero: boolean = false;
  clientess = [
    { id: null, nombre: 'Todos' },
    { id: 1, nombre: 'Juan' },
    { id: 2, nombre: 'María' }
  ];
  /**
   *
   */
  constructor(private authService: AuthService,
    private fb: FormBuilder,
    private toastrService: ToastrService,
    private appComponent: AppComponent,
    private pygService: PygService,
    private checklistService: ChecklistService,
    private loadingService: LoadingService,
    private router: Router,
    private route: ActivatedRoute,
  ) {

  }
  ngOnInit(): void {
    this.tipoAcceso = this.route.snapshot.paramMap.get("tipo") ?? "";
    this.modoDetalleRegistro = this.tipoAcceso === "1";
    if (this.route.snapshot.paramMap.get("id")) {
      this.idRegistro = this.route.snapshot.paramMap.get("id");
    }
    this.obtenerUsuario();
    this.obtenerInformacionInicial();
    (window as any).seleccionarFactura = this.seleccionarFactura.bind(this);
  }

  ramoSeleccionado: any;
  mostrarCamposFactura: boolean = false;
  cargarTablaFacturas() {
    this.dtOptions = {
      destroy: true,
      data: this.lstFacturasCliente.filter(
        (item: any) => item.seleccionado == 0
      ),
      dom:
        '<"row mb-2 align-items-center"' +
        '<"col-md-6 text-start"<"custom-toolbar-main">>' +
        '<"col-md-6 text-end"f>' +
        '>' +
        '<"row mb-2"' +
        '<"col-12"<"custom-toolbar-manual">>' +
        '>' +
        'rtip',

      initComplete: () => {
        $('.custom-toolbar-main').html(`
    <div class="d-flex align-items-center gap-2 flex-wrap">
      <input
        id="txtNumeroFactura"
        type="text"
        class="form-control form-control-sm"
        placeholder="Número de factura"
        style="width: 180px;"
      >
&nbsp;
      <button id="btnConsultar" class="btn btn-primary btn-sm" style="font-weight:bold">
        <i class="fas fa-search"></i> Buscar
      </button>
&nbsp;
      <button id="btnAgregar" class="btn btn-warning btn-sm" style="color:white;font-weight:bold">
        <i class="fas fa-plus-circle"></i> Agregar
      </button>
    </div>
  `);

        $('.custom-toolbar-manual').html(`
  <div id="rowFacturaManual" class="row g-2 align-items-center w-100" style="display:none;">

    <div class="col-12">
      <h6 class="mb-1 fw-bold">
        Datos para la Factura
      </h6>
    </div>
    <div class="col-md-3">
      <input
        id="txtNumeroDocumento"
        type="text"
        class="form-control form-control-sm"
        placeholder="Número de factura"
      >
    </div>
    <div class="col-md-3">
      <input
        id="txtDescripcion"
        type="text"
        class="form-control form-control-sm"
        placeholder="Descripción"
      >
    </div>

    <div class="col-md-2">
      <input
        id="txtFecha"
        type="date"
        class="form-control form-control-sm"
      >
    </div>

    <div class="col-md-3">
      <input
        id="txtValor"
        type="number"
        class="form-control form-control-sm"
        placeholder="Ingrese el Valor"
      >
    </div>

    <div class="col-md-1 d-flex gap-1">
      <button
        id="btnAceptarFactura"
        class="btn btn-success btn-sm"
        title="Aceptar"
      >
        ✓
      </button>
&nbsp;
      <button
        id="btnCancelarFactura"
        class="btn btn-danger btn-sm"
        title="Cancelar"
      >
        ✕
      </button>
    </div>

  </div>
`);

        $('#btnConsultar').on('click', () => {
          const numeroFactura = ($('#txtNumeroFactura').val() as string)?.trim();

          if (!numeroFactura) {
            alert('Ingrese un número de factura');
            return;
          }

          this.buscarOtros(numeroFactura);
        });

        $('#btnAgregar').on('click', () => {
          $('#rowFacturaManual').slideDown(150);
        });

        $('#btnCancelarFactura').on('click', () => {
          $('#rowFacturaManual').slideUp(150);
          $('#txtDescripcion').val('');
          $('#txtFecha').val('');
          $('#txtNumeroDocumento').val('');
          $('#txtValor').val('');
        });

        $('#btnAceptarFactura').on('click', () => {
          const descripcion = ($('#txtDescripcion').val() as string)?.trim();
          const fecha = ($('#txtFecha').val() as string)?.trim();
          const valor = ($('#txtValor').val() as string)?.trim();
          const factura = ($('#txtNumeroDocumento').val() as string)?.trim();
          if (!descripcion || !fecha || !valor) {
            alert('Debe ingresar descripción, fecha y valor');
            return;
          }
          let detFactura = {
            idRamo: this.ramoSeleccionado.idRamo,
            descripcion: descripcion,
            valor: valor,
            idDetalleFact: '',
            fechaFactura: fecha,
            numero_documento: factura,
            idGasto: this.idGastoSeleccionado
          };

          if (!this.ramoSeleccionado.facturas) {
            this.ramoSeleccionado.facturas = [];
          }
          this.ramoSeleccionado.facturas.push(detFactura);
          this.toastrService.success(
            'Correcto!',
            'Datos de factura agregados correctamente.'
          );
          $('#rowFacturaManual').slideUp(150);
          $('#txtDescripcion').val('');
          $('#txtFecha').val('');
          $('#txtNumeroDocumento').val('');
          $('#txtValor').val('');
        });
      },
      info: false,
      pageLength: 7,
      lengthChange: false,
      language: {
        ...this.GetSpanishLanguage()
      },
      columns: [
        {
          title: 'N°Fac.',
          data: 'numero_documento',
          render: function (data: any, type: any, row: any) {
            if (data === null || data === undefined || data === '') {
              return 'Asiento Contable ';
            }

            return 'Factura ' + data;
          }
        },
        { title: 'Centro Costos', data: 'canal_nombre' },
        {
          title: 'Proveedor/Cliente',
          data: 'proveedor_nombre',
          render: (data: any, type: any, row: any) => {
            const proveedor = data?.trim();
            const cliente = row.cliente_nombre?.trim();
            const referencia = row.referencia?.trim();

            return proveedor || cliente || referencia || '';
          }
        },
        {
          title: 'Fecha',
          data: 'fecha_emision',
          render: (data: any, type: any, row: any) => {
            return data || row.fecha;
          }
        },
        {
          title: 'Observacion',
          data: 'observacion',
          render: (data: any, type: any, row: any) => {
            return data || row.nombre_cuenta || '';
          }
        },
        {
          title: 'Valor+IVA',
          data: 'base_con_iva',
          render: (data: any, type: any, row: any) => {
            const valor = data ?? row.valor_debe; // preguntar si en asientos contables va voler_debe o valor_haber

            return new Intl.NumberFormat('es-EC', {
              style: 'currency',
              currency: 'USD'
            }).format(valor || 0);
          }
        },
        {
          title: '<i class="fas fa-cogs me-1"></i> Opción',
          searchable: false,
          render: (data: any, type: any, full: any) => {

            let botones = '';
            botones += `<button title="asignar" class="btn btn-success btn-sm" onclick="seleccionarFactura(${full.id})"><i class="fas fa-check"></i></button>`;

            return `<div class="d-flex justify-content-center flex-nowrap" style="gap:5px">${botones}</div>`;
          }
        }
      ],

      // order: [
      //   [0, 'desc']
      // ],
      ordering: false,
      responsive: false,
      autoWidth: false,
      scrollX: true,
    };
    this.dataTable = $(this.tableFacturas.nativeElement);

    const dt = this.dataTable.DataTable(this.dtOptions);

    setTimeout(() => {
      dt.columns.adjust().draw();
    }, 200);
    $('#modalFacturas').on('shown.bs.modal', () => {
      const dt = this.dataTable.DataTable();
      dt.columns.adjust().draw();
    });
  }
  obtenerInformacionInicial() {
    this.loadingService.showLoading();
    this.ingresoForm = this.fb.group({
      id: [],
      cliente: [null, Validators.required],
      nombreCliente: [],
      ramo: [null, Validators.required],
      nombreRamo: [],
      inicioVigencia: [new Date().toISOString().split('T')[0], Validators.required],
      finVigencia: [new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], Validators.required],
      primaMensual: ['', Validators.required],
      primaAnual: ['', Validators.required],
      porcentajeComision: ['', Validators.required],
      comision: ['', Validators.required],
      comisionAnual: ['', Validators.required],
      poliza: [''],
      gastos: [[], ''],
      aseguradora: [null, Validators.required],
    });
    this.gastoForm = this.fb.group({
      descripcion: ['', Validators.required],
      cantidad: [1, Validators.required],
      valor: [null, [Validators.required, Validators.min(0.01)]]
    });
    this.lstPYG = [];
    this.lstGastos = [];
    //
    this.clientesInput$
      .pipe(
        debounceTime(400),
        tap(() => this.loadingClientes = true),
        switchMap(term => this.pygService.consultarClienteNombre(term))
      )
      .subscribe((resp: any) => {
        this.clientes = resp;
        this.loadingClientes = false;
      });
    this.checklistService.obtenerRamos().subscribe((res: any) => {
      this.lstRamos = res.resultado;
    }, (error: any) => {
      this.toastrService.error('ERROR', 'Error al obtener los Ramos!');
    });
    this.checklistService.obtenerAseguradoras().subscribe((res: any) => {
      this.lstAseguradoras = res.resultado;
    }, (error: any) => {
      this.toastrService.error('ERROR', 'No se pudo obtener la información de Aseguradoras!');
    });
    setTimeout(() => {
      this.loadingService.hideLoading();
    }, 1500);
  }
  async obtenerUsuario() {
    this.userCurrent = await this.authService.getUserInfor();
    if (this.userCurrent.get_roles.id == 32) {
      this.esFinanciero = true;
      // Colapsar sidebar automáticamente
      document.body.classList.add('sidebar-collapse');
    }
    if (this.idRegistro && this.modoDetalleRegistro) {
      this.selectRamo = 999;
      this.selectVigencia = null;
      this.cargarDatosRegistro();
      return;
    }
    if (this.idRegistro) {
      this.pygService.obtenerFiltrosPYG(this.idRegistro).subscribe((res: any) => {
        if (res.idCliente != null) {
          this.clienteSeleccionado = { ...(this.clienteSeleccionado ?? {}), id: res.idCliente };
        }
        let anios = (res.anios ?? [])
          .sort((a: number, b: number) => b - a)
          .map((anio: number) => ({
            id: anio,
            value: anio
          }));
        this.selectVigencia = anios[0]?.value;
        this.lstAniosCargados = anios;
        this.cargarDatosRegistro();
      });

    }
  }
  formatearMoneda() {
    const mensualControl = this.ingresoForm.get('primaMensual');
    const anualControl = this.ingresoForm.get('primaAnual');

    if (!mensualControl || !anualControl) return;

    let valor = mensualControl.value;
    if (!valor) return;

    // limpiar formato
    valor = valor.toString()
      .replace(/\./g, '')
      .replace(',', '.');

    const numero = parseFloat(valor);

    if (!isNaN(numero)) {

      // formatear mensual
      const mensualFormateado = numero.toLocaleString('es-EC', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      mensualControl.setValue(mensualFormateado, { emitEvent: false });

      // calcular anual
      const anual = numero * 12;

      anualControl.setValue(anual.toFixed(2), { emitEvent: false });
    }
  }
  changePrimaMensual() {
    const prima = Number(this.ingresoForm.get('primaMensual')?.value || 0);
    this.ingresoForm.get('primaAnual')?.setValue(Number((prima * 12).toFixed(2)), { emitEvent: false });
    this.changePorcentaje();
  }
  changePorcentaje() {
    const prima = Number(this.ingresoForm.get('primaMensual')?.value || 0);
    const porcentaje = Number(this.ingresoForm.get('porcentajeComision')?.value || 0);
    const mensual = Number((prima * porcentaje / 100).toFixed(2));
    this.ingresoForm.get('comision')?.setValue(mensual, { emitEvent: false });
    this.ingresoForm.get('comisionAnual')?.setValue(Number((mensual * 12).toFixed(2)), { emitEvent: false });
  }
  changeComisionMensual() {
    const mensual = Number(this.ingresoForm.get('comision')?.value || 0);
    const porcentaje = Number(this.ingresoForm.get('porcentajeComision')?.value || 0);
    this.ingresoForm.get('comisionAnual')?.setValue(Number((mensual * 12).toFixed(2)), { emitEvent: false });
    if (porcentaje > 0) {
      const prima = Number((mensual * 100 / porcentaje).toFixed(2));
      this.ingresoForm.get('primaMensual')?.setValue(prima, { emitEvent: false });
      this.ingresoForm.get('primaAnual')?.setValue(Number((prima * 12).toFixed(2)), { emitEvent: false });
    }
  }
  changeComisionAnual() {
    const anual = Number(this.ingresoForm.get('comisionAnual')?.value || 0);
    const mensual = Number((anual / 12).toFixed(2));
    const porcentaje = Number(this.ingresoForm.get('porcentajeComision')?.value || 0);
    this.ingresoForm.get('comision')?.setValue(mensual, { emitEvent: false });
    if (porcentaje > 0) {
      const prima = Number((anual * 100 / porcentaje / 12).toFixed(2));
      this.ingresoForm.get('primaMensual')?.setValue(prima, { emitEvent: false });
      this.ingresoForm.get('primaAnual')?.setValue(Number((prima * 12).toFixed(2)), { emitEvent: false });
    }
  }
  esEdicion: boolean = false;
  indexEditar: any;
  //para EL GASTO
  agregarGasto() {
    if (!this.puedeAgregarGasto()) {
      this.toastrService.warning('Aviso', 'El estado del registro no permite agregar gastos.');
      return;
    }
    if (this.gastoForm.valid) {
      let tipo = 'Inicial';
      if ((this.ingresoRamoSeleccionado && this.idRamoSeleccionado) || this.programaAnteriorEdicion?.idGrupo != null) {
        tipo = 'Alcance';
      }
      let gasto = {
        descripcion: this.gastoForm.value.descripcion,
        valor: this.gastoForm.value.valor,
        cantidad: this.gastoForm.value.cantidad,
        tipo: tipo,
        fecha: this.formatearFechaExcel(new Date())
      }
      this.lstGastos.push(gasto);
      this.gastoForm.reset({
        descripcion: '',
        valor: null,
        tipo: '',
        fecha: '',
        cantidad: 1
      });
      this.toastrService.success(
        'Correcto!',
        'Contacto agregado correctamente.'
      );
    } else {
      this.appComponent.validateAllFormFields(this.gastoForm);
      this.toastrService.error(
        'Error al agregar el gasto',
        'No se llenaron todos los campos necesarios.'
      );
    }
  }
  editarGasto(item: any) {
    const itemEditar = this.lstGastos[item];
    if (!this.puedeEditarGasto(itemEditar)) {
      this.toastrService.warning('Aviso', 'Este gasto no puede editarse por su estado o porque tiene facturas asignadas.');
      return;
    }
    this.indexEditar = item;
    this.esEdicion = true;
    this.gastoForm.patchValue({
      descripcion: itemEditar.descripcion,
      valor: Number(itemEditar.valor),
      cantidad: Number(itemEditar.cantidad || 1)
    });
    this.gastoForm.markAsPristine();
  }
  actualizarGasto() {
    if (!this.gastoForm.valid) {
      this.appComponent.validateAllFormFields(this.gastoForm);
      return;
    }
    const anterior = this.lstGastos[this.indexEditar];
    if (!this.puedeEditarGasto(anterior)) {
      this.toastrService.warning('Aviso', 'Este gasto no puede actualizarse.');
      return;
    }
    const gasto = {
      ...anterior,
      descripcion: this.gastoForm.value.descripcion,
      valor: Number(this.gastoForm.value.valor),
      cantidad: Number(this.gastoForm.value.cantidad),
      tipo: anterior.tipo || (this.programaAnteriorEdicion?.idGrupo != null ? 'Alcance' : 'Inicial'),
      fecha: anterior.fecha || this.formatearFechaExcel(new Date())
    };
    // Mantener el id del gasto existente para que Laravel realice UPDATE y no INSERT.
    this.lstGastos[this.indexEditar] = gasto;
    // La edición del grupo utiliza los gastos consolidados en el primer ramo.
    if (this.lstIngresosGastos.length > 0) {
      this.lstIngresosGastos[0].gastos = [...this.lstGastos];
      for (let i = 1; i < this.lstIngresosGastos.length; i++) {
        this.lstIngresosGastos[i].gastos = [];
      }
    }
    this.esEdicion = false;
    this.indexEditar = null;
    this.gastoForm.reset({ descripcion: '', valor: null, cantidad: 1 });
    this.toastrService.success('Correcto!', 'Gasto actualizado en el detalle. Guarde el PYG para persistir el cambio.');
  }
  eliminarGasto(item: any) {
    const gasto = this.lstGastos[item];
    if (!gasto || gasto.id != null || !this.puedeAgregarGasto()) return;
    this.lstGastos.splice(item, 1);
  }
  cancelarActualizar() {
    this.esEdicion = false;
    this.gastoForm.reset({
      descripcion: '',
      valor: null,
      tipo: '',
      fecha: '',
      cantidad: '',
    });
  }
  get totalDetalleGastos(): number {
    return this.lstGastos.reduce(
      (a: number, b: any) => a + Number(b.valor),
      0
    );
  }
  get totalCantidadGastos(): number {
    return this.lstGastos.reduce(
      (a: number, b: any) => a + Number(b.cantidad),
      0
    );
  }
  get gastosConsolidadosPYG(): any[] {
    return this.lstIngresosGastos.reduce((gastos: any[], ingreso: any) => gastos.concat(ingreso.gastos || []), []);
  }
  get totalGastos(): number {
    return this.lstIngresosGastos.reduce((totalIngresos: any, ingreso: any) => {
      const sumaGastos = ingreso.gastos.reduce((totalGastos: any, gasto: any) => Number(totalGastos) + Number(gasto.valor), 0);
      return totalIngresos + sumaGastos;
    }, 0);
  }
  get totalGastosFacturas(): number {
    return this.lstIngresosGastos.reduce((totalFacturas: number, ingreso: any) => {
      const sumaFacturas = (ingreso.facturas || []).reduce(
        (total: number, factura: any) => total + Number(factura.valor || 0),
        0
      );
      return totalFacturas + sumaFacturas;
    }, 0);
  }
  get totalIngresos(): number {
    return this.lstIngresosGastos.reduce((total: any, item: any) => Number(total) + Number(item.comisionAnual), 0);
  }
  get totalFinal(): number {
    return Number(this.totalIngresos) - Number(this.totalGastos);
  }
  get porcentajeInversion(): number {
    const totalGastos = this.lstGastos.reduce((total: any, gasto: any) => total + Number(gasto.valor), 0);
    const presupuesto = this.lstPYG.reduce((total: any, gasto: any) => total + Number(gasto.valor), 0);

    if (!presupuesto) {
      return 0;
    }

    return Math.round((totalGastos / presupuesto) * 100 * 100) / 100;
  }
  get totalPrimaMensualRamos(): number {
    return this.lstIngresosGastos.reduce((total: number, item: any) => total + Number(item.primaMensual || 0), 0);
  }
  get totalPrimaAnualRamos(): number {
    return this.lstIngresosGastos.reduce((total: number, item: any) => total + Number(item.primaAnual || 0), 0);
  }
  get totalComisionMensualRamos(): number {
    return this.lstIngresosGastos.reduce((total: number, item: any) => total + Number(item.comision || 0), 0);
  }
  lstIngresosGastos: any = [];
  programasGenerados: any[] = [];
  private secuenciaGrupoTemporal: number = 0;
  generarIdGrupoTemporal(): string {
    this.secuenciaGrupoTemporal++;
    return 'tmp-' + this.secuenciaGrupoTemporal;
  }
  // Fotografía de los datos persistentes por registro PYG (no incluye cálculos ni proyecciones).
  private registrosOriginalesPYG = new Map<string, string>();

  private claveRegistroPYG(programa: any): string {
    return String(programa.idGrupo ?? programa.idGrupoTemporal ?? '');
  }

  private huellaRegistroPYG(programa: any): string {
    const texto = (valor: any) => String(valor ?? '').trim();
    const numero = (valor: any) => Number(valor ?? 0);
    const gastos: any[] = [];
    (programa.ramos || []).forEach((ramo: any) => {
      (ramo.gastos || []).forEach((gasto: any) => {
        // Los gastos se almacenan a nivel de registro, no por ramo.
        const clave = gasto.id != null ? 'id:' + gasto.id : null;
        if (clave && gastos.some((g: any) => g.clave === clave)) return;
        gastos.push({
          clave,
          id: gasto.id ?? null,
          descripcion: texto(gasto.descripcion),
          valor: numero(gasto.valor),
          cantidad: numero(gasto.cantidad ?? 1),
          tipo: texto(gasto.tipo || 'Inicial')
        });
      });
    });
    gastos.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const ramos = (programa.ramos || []).map((ramo: any) => ({
      idRamo: ramo.idRamo ?? null,
      ramo: texto(ramo.ramo),
      aseguradora: texto(ramo.aseguradora),
      inicioVigencia: texto(ramo.inicioVigencia).substring(0, 10),
      finVigencia: texto(ramo.finVigencia).substring(0, 10),
      primaMensual: numero(ramo.primaMensual),
      porcentajeComision: numero(ramo.porcentajeComision),
      poliza: texto(ramo.poliza),
      archivosNuevos: (ramo.archivosAprobacion || [])
        .filter((archivo: any) => archivo instanceof File)
        .map((archivo: File) => `${archivo.name}:${archivo.size}:${archivo.lastModified}`)
        .sort()
    })).sort((a: any, b: any) => String(a.idRamo ?? '').localeCompare(String(b.idRamo ?? '')));
    return JSON.stringify({ nombre: texto(programa.nombre), ramos, gastos });
  }

  private guardarFotografiaRegistrosPYG(): void {
    this.registrosOriginalesPYG.clear();
    this.programasGenerados.forEach((programa: any) => {
      if (programa.idGrupo != null) {
        this.registrosOriginalesPYG.set(
          this.claveRegistroPYG(programa), this.huellaRegistroPYG(programa)
        );
      }
    });
  }

  // Un registro aprobado modificado solo vuelve a aprobación si los
  // gastos acumulados sobrepasan el presupuesto máximo autorizado.
  // La autorización de edición sigue usando el estado persistido.
  obtenerEstadoVisualPrograma(programa: any): number {
    const estado = this.obtenerIdEstadoPrograma(programa);
    if (estado === 4 && programa?.idGrupo != null &&
      this.registrosOriginalesPYG.has(this.claveRegistroPYG(programa)) &&
      this.registrosOriginalesPYG.get(this.claveRegistroPYG(programa)) !== this.huellaRegistroPYG(programa) &&
      this.presupuestoPrograma(programa).excedido) {
      return 1;
    }
    return estado;
  }

  obtenerProgramasGuardado(): any[] {
    return this.programasGenerados.filter((programa: any) => {
      if (programa.idGrupo == null) return true;
      return this.registrosOriginalesPYG.get(this.claveRegistroPYG(programa))
        !== this.huellaRegistroPYG(programa);
    });
  }
  get programasVisualizados(): any[] {
    if (!this.idRegistro || this.modoDetalleRegistro) return this.programasGenerados;
    const seleccion = String(this.selectRamo ?? '999');
    const anio = Number(this.selectVigencia);
    return this.programasGenerados.filter((grupo: any) => {
      const ramos = grupo.ramos || [];
      const id = grupo.idGrupo ?? grupo.idGrupoTemporal;
      const coincideGrupo = seleccion === '999' || seleccion === 'g:' + String(id);
      const coincideVigencia = !Number.isFinite(anio) || anio <= 0 || ramos.some((ramo: any) => {
        const inicio = String(ramo.inicioVigencia || '');
        const anioInicio = Number(inicio.substring(0, 4));
        return Number.isFinite(anioInicio) && anioInicio >= anio;
      });
      return coincideGrupo && coincideVigencia;
    });
  }
  actualizarFiltroVista(): void {
    // Los filtros se aplican mediante programasVisualizados sin recargar registros.
  }
  actualizarOpcionesFiltroGrupos(): void {
    this.lstRamosCargados = this.programasGenerados.map((grupo: any) => {
      const ramos = grupo.ramos || [];
      const id = grupo.idGrupo ?? grupo.idGrupoTemporal;
      return {
        id: 'g:' + String(id),
        nombre: ramos.length > 1 ? (grupo.nombre || 'Grupo ' + id) : (ramos[0]?.nombreRamo || grupo.nombre || 'Ramo'),
        tipo: ramos.length > 1 ? 'Grupo' : 'Ramo'
      };
    });
  }
  get totalIngresosGeneral(): number {
    return this.programasVisualizados.reduce((total: number, programa: any) => total + this.sumarCampoPrograma(programa, 'comisionAnual'), 0);
  }
  get totalGastosGeneral(): number {
    return this.programasVisualizados.reduce((total: number, programa: any) => total + this.totalGastosPrograma(programa), 0);
  }
  sumarCampoPrograma(programa: any, campo: string): number {
    return programa.ramos.reduce((total: number, ramo: any) => total + Number(ramo[campo] || 0), 0);
  }
  gastosPrograma(programa: any): any[] {
    return programa.ramos.reduce((gastos: any[], ramo: any) => gastos.concat(ramo.gastos || []), []);
  }
  totalGastosPrograma(programa: any): number {
    return this.gastosPrograma(programa).reduce((total: number, gasto: any) => total + Number(gasto.valor || 0), 0);
  }
  // Muestra las columnas de facturas solo cuando hay facturas asignadas al registro.
  tieneFacturasAsignadasPrograma(programa: any): boolean {
    return (programa.ramos || []).some((ramo: any) => (ramo.facturas || []).length > 0);
  }
  totalFacturasPrograma(programa: any): number {
    return programa.ramos.reduce((total: number, ramo: any) => total + (ramo.facturas || []).reduce((valor: number, factura: any) => valor + Number(factura.valor || 0), 0), 0);
  }
  get totalFacturasGeneral(): number {
    return this.programasVisualizados.reduce((total: number, programa: any) => total + this.totalFacturasPrograma(programa), 0);
  }
  get filasGastosResumenGeneral(): number {
    return this.totalGastosGeneral ? this.totalFacturasGeneral / this.totalGastosGeneral * 100 : 0;
  }
  getGastosFacturasPrograma(programa: any): any[] {
    const filas: any[] = [];
    const facturas = (programa.ramos || []).reduce((lista: any[], ramo: any) => lista.concat(ramo.facturas || []), []);
    this.gastosPrograma(programa).forEach((gasto: any, indice: number) => {
      const relacionadas = facturas.filter((factura: any) => gasto.id != null && factura.idGasto != null && Number(factura.idGasto) === Number(gasto.id));
      const cantidadFilas = Math.max(relacionadas.length, 1);
      for (let i = 0; i < cantidadFilas; i++) {
        filas.push({ gasto, factura: relacionadas[i] || null, mostrarGasto: i === 0, cantidadFilas, totalFacturas: relacionadas.reduce((total: number, factura: any) => total + Number(factura.valor || 0), 0), indice, indexFactura: i });
      }
    });
    return filas;
  }
  quitarFacturaPrograma(programa: any, fila: any): void {
    if (!fila.factura) return;
    const ramo = (programa.ramos || []).find((item: any) => (item.facturas || []).includes(fila.factura));
    if (!ramo) return;
    this.quitarFactura(fila.factura, ramo, ramo.facturas.indexOf(fila.factura));
  }
  indiceProgramaEdicion: number | null = null;
  programaAnteriorEdicion: any = null;
  editarProgramaGenerado(index: number): void {
    if (this.lstIngresosGastos.length > 0) {
      this.toastrService.error('Atención', 'Genere primero el registro que está preparando.');
      return;
    }
    const programa = this.programasGenerados[index];
    if (!programa) return;
    const estado = this.obtenerIdEstadoPrograma(programa);
    if (programa.idGrupo != null && estado !== 2 && estado !== 4) {
      this.toastrService.warning('Aviso', 'El estado del registro no permite modificar sus gastos.');
      return;
    }
    this.indiceProgramaEdicion = index;
    this.programaAnteriorEdicion = programa;
    this.nombrePrograma = programa.nombre;
    this.lstIngresosGastos = programa.ramos.map((ramo: any) => ({ ...ramo, gastos: [...(ramo.gastos || [])] }));
    this.lstGastos = this.gastosPrograma(programa).map((gasto: any) => ({ ...gasto }));
    this.esEdicion = false;
    this.editarIngresoGasto = false;
    this.ingresoRamoSeleccionado = [];
    this.idRamoSeleccionado = null;
    if (programa.idGrupo != null) {
      Swal.fire({
        title: 'Aviso',
        text: 'Los nuevos registros de gastos se ingresan como alcance al PYG.',
        icon: 'warning'
      });
    }
    this.programasGenerados.splice(index, 1);
    this.registroGenerado = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  cancelarEdicionPrograma(): void {
    if (this.indiceProgramaEdicion === null) return;
    this.programasGenerados.splice(this.indiceProgramaEdicion, 0, this.programaAnteriorEdicion);
    this.lstIngresosGastos = [];
    this.lstGastos = [];
    this.indiceProgramaEdicion = null;
    this.programaAnteriorEdicion = null;
    this.nombrePrograma = '';
    this.editarIngresoGasto = false;
    this.limpiarFormIngreso();
    this.gastoForm.reset({ descripcion: '', valor: null, cantidad: 1 });
  }
  registroGenerado: boolean = false;
  nombrePrograma: string = '';
  async guardarIngresoGastos() {
    try {
      if (this.ingresoForm.valid) {
        const ramo = this.lstRamos.find((r: any) => r.cdRamo == this.ingresoForm.value.ramo);
        const aseguradora = this.lstAseguradoras.find((r: any) => r.id == this.ingresoForm.value.aseguradora);

        let ingreso = {
          idIngreso: '',
          cliente: this.ingresoForm.getRawValue().cliente,
          nombreCliente: this.clienteSeleccionado?.nombres ?? this.clienteSeleccionado?.NOMBRES ?? '',
          idCliente: this.clienteSeleccionado.id,
          ramo: this.ingresoForm.value.ramo,
          nombreRamo: ramo.nmRamo,
          aseguradora: this.ingresoForm.value.aseguradora,
          nombreAseguradora: aseguradora.alias,
          inicioVigencia: this.ingresoForm.value.inicioVigencia,
          finVigencia: this.ingresoForm.value.finVigencia,
          primaMensual: this.ingresoForm.value.primaMensual,
          primaAnual: this.ingresoForm.value.primaAnual,
          porcentajeComision: this.ingresoForm.value.porcentajeComision,
          comision: this.ingresoForm.value.comision,
          comisionAnual: this.ingresoForm.value.comisionAnual,
          poliza: this.ingresoForm.value.poliza,
          gastos: [],
          archivosAprobacion: [] as File[],
          nombresUsuario: (
            (this.userCurrent?.get_persona.nombre ?? '') + ' ' +
            (this.userCurrent?.get_persona.apellido ?? '')
          ).trim()
        };

        this.lstIngresosGastos.push(ingreso);
        this.limpiarFormIngreso();
        this.toastrService.success('Correcto!', 'Ramo agregado al detalle.');
      } else {
        const camposInvalidos: string[] = [];

        Object.keys(this.ingresoForm.controls).forEach(campo => {
          const control = this.ingresoForm.get(campo);

          if (control && control.invalid) {
            camposInvalidos.push(campo);
          }
        });
        this.appComponent.validateAllFormFields(this.ingresoForm);
        this.toastrService.error(
          'Error al agregar el Detalle',
          'No se llenaron todos los campos necesarios.'
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        this.toastrService.error('Error al agregar el Detalle', error.message);
      } else {
        this.toastrService.error(
          'Error al agregar el Detalle',
          'Solicitar soporte al departamento de TI.'
        );
      }
    } finally {
      this.loadingService.hideLoading();
    }

  }
  limpiarFormIngreso() {
    this.ingresoRamoSeleccionado = [];
    this.ingresoForm.get('cliente')?.disable();
    this.ingresoForm.get('cliente')?.updateValueAndValidity();

    this.ingresoForm.patchValue({
      ramo: null,
      inicioVigencia: new Date().toISOString().split('T')[0],
      finVigencia: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      primaMensual: '',
      primaAnual: '',
      porcentajeComision: '',
      comision: '',
      comisionAnual: '',
      aseguradora: null,
      gastos: [],
      poliza: ''
    });
  }
  sumarGastos(gastos: any[]): number {
    if (!gastos) return 0;
    return gastos.reduce((total, g) => total + (Number(g.valor) || 0), 0);
  }
  calcularPorcentajeGastos(): number {
    if (!this.totalIngresos || this.totalIngresos === 0) {
      return 0;
    }
    return (this.totalGastos / this.totalIngresos) * 100;
  }
  calcularPorcentajeGastosxRamo(gastos: any[], comision: any): number {
    const totalGastos = (gastos || []).reduce(
      (total: number, gasto: any) => total + Number(gasto?.valor || 0),
      0
    );

    const comisionNumero = Number(comision || 0);

    if (comisionNumero <= 0) {
      return 0;
    }

    return (totalGastos / comisionNumero) * 100;
  }

  // ==========================================================
  // VISUALIZACIÓN DE RESPALDOS DE ACEPTACIÓN - FINANCIERO
  // ==========================================================
  archivosAceptacionRamo: any[] = [];
  ramoAceptacionSeleccionado: any = null;
  cargandoArchivosAceptacion: boolean = false;

  mostrarBotonAceptacion(ingreso: any): boolean {
    if (!this.esFinanciero || !ingreso?.idRamo) {
      return false;
    }

    const porcMaxGasto = Number(this.userCurrent?.porcMaxgasto || 0);

    if (porcMaxGasto <= 0) {
      return false;
    }

    const porcentajeActual = this.calcularPorcentajeGastosxRamo(
      ingreso?.gastos || [],
      ingreso?.comisionAnual
    );

    return porcentajeActual >= porcMaxGasto;
  }

  abrirModalAceptacion(ingreso: any): void {
    this.ramoAceptacionSeleccionado = ingreso;
    this.archivosAceptacionRamo = [];
    this.cargandoArchivosAceptacion = true;


    this.pygService.obtenerArchivosAprobacion(ingreso.idRamo)
      .subscribe({
        next: (res: any) => {
          this.archivosAceptacionRamo = res?.archivos ?? [];
          this.cargandoArchivosAceptacion = false;
        },
        error: () => {
          this.cargandoArchivosAceptacion = false;
          this.archivosAceptacionRamo = [];
          this.toastrService.error(
            'Error',
            'No se pudieron obtener los archivos de aceptación.'
          );
        }
      });
  }

  visualizarArchivoAceptacion(archivo: any): void {
    if (!this.ramoAceptacionSeleccionado?.idRamo || !archivo?.nombre) {
      return;
    }

    this.pygService.visualizarArchivoAprobacion(
      this.ramoAceptacionSeleccionado.idRamo,
      archivo.nombre
    ).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');

        // Se libera más tarde para dar tiempo al navegador a abrir el recurso.
        setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      },
      error: () => {
        this.toastrService.error(
          'Error',
          'No se pudo visualizar el archivo.'
        );
      }
    });
  }

  descargarArchivoAceptacion(archivo: any): void {
    if (!this.ramoAceptacionSeleccionado?.idRamo || !archivo?.nombre) {
      return;
    }

    this.pygService.descargarArchivoAprobacion(
      this.ramoAceptacionSeleccionado.idRamo,
      archivo.nombre
    ).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = archivo.nombre;
        document.body.appendChild(enlace);
        enlace.click();
        document.body.removeChild(enlace);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.toastrService.error(
          'Error',
          'No se pudo descargar el archivo.'
        );
      }
    });
  }

  async validarPorcentajeMaximoGasto(registro: any): Promise<boolean> {
    const exceso = this.obtenerExcesoPresupuesto(registro);
    if (exceso.excedido) {
      await Swal.fire({
        icon: 'warning',
        title: 'Presupuesto sobrepasado',
        html: `Presupuesto máximo (${exceso.limitePorcentaje}%): <b>$${exceso.maximo.toFixed(2)}</b><br>Gastos registrados: <b>$${exceso.gastos.toFixed(2)}</b><br>Excedente: <b>$${exceso.excedente.toFixed(2)}</b><br>Inversión actual: <b>${exceso.porcentaje.toFixed(2)}%</b>`,
        confirmButtonText: 'Entendido'
      });
    }
    return true;
  }
  obtenerExcesoPresupuesto(registro: any): any {
    const ingresos = Number(registro?.comisionAnual || 0);
    const limitePorcentaje = Number(this.userCurrent?.porcMaxgasto || 0);
    const gastos = (registro?.gastos || []).reduce((suma: number, gasto: any) => suma + Number(gasto.valor || 0), 0);
    const maximo = ingresos * limitePorcentaje / 100;
    const porcentaje = ingresos > 0 ? gastos / ingresos * 100 : 0;
    return { excedido: ingresos > 0 && limitePorcentaje > 0 && gastos > maximo, limitePorcentaje, maximo, gastos, porcentaje, excedente: Math.max(0, gastos - maximo) };
  }
  polizasPendientes(programa: any): number {
    return programa.ramos.filter((ramo: any) => !String(ramo.poliza ?? '').trim()).length;
  }
  presupuestoPrograma(programa: any): any {
    return this.obtenerExcesoPresupuesto({ comisionAnual: this.sumarCampoPrograma(programa, 'comisionAnual'), gastos: this.gastosPrograma(programa) });
  }
  obtenerIdEstadoPrograma(programa: any): number {
    const estadoGuardado = programa?.idEstado ?? programa?.ramos?.[0]?.idEstado;
    if (estadoGuardado !== null && estadoGuardado !== undefined && estadoGuardado !== '') return Number(estadoGuardado);
    return this.presupuestoPrograma(programa).excedido ? 1 : 4;
  }
  // Reglas para la edición de gastos según el estado persistido del PYG.
  estadoProgramaEnEdicion(): number | null {
    const programa = this.programaAnteriorEdicion;
    return programa?.idGrupo != null ? this.obtenerIdEstadoPrograma(programa) : null;
  }
  gastoTieneFacturasAsignadas(gasto: any, programa: any = this.programaAnteriorEdicion): boolean {
    if (gasto?.id == null || !programa) return false;
    return (programa.ramos || []).some((ramo: any) =>
      (ramo.facturas || []).some((factura: any) =>
        factura.idGasto != null && Number(factura.idGasto) === Number(gasto.id)));
  }
  puedeEditarGasto(gasto: any): boolean {
    if (!gasto || this.modoDetalleRegistro) return false;
    const estado = this.estadoProgramaEnEdicion();
    if (estado === 1 || estado === 4 || estado === 6) return false;
    if (estado === 2) return !this.gastoTieneFacturasAsignadas(gasto);
    return gasto.id == null;
  }
  puedeAgregarGasto(): boolean {
    if (this.modoDetalleRegistro) return false;
    const estado = this.estadoProgramaEnEdicion();
    return estado === null || estado === 2 || estado === 4;
  }
  nombreEstadoPYG(estado: number): string {
    if (estado === 1) return 'Pendiente aprobación';
    if (estado === 2) return 'Corrección solicitada';
    if (estado === 4) return 'Aprobado';
    if (estado === 6) return 'Rechazado';
    return 'Estado ' + estado;
  }
  nombreEstadoPrograma(programa: any): string {
    const idEstado = this.obtenerIdEstadoPrograma(programa);
    if (idEstado === 1) return 'Pendiente aprobación';
    if (idEstado === 4) return 'Ingresado Aprobado';
    return 'Estado ' + idEstado;
  }

  /**
   * Abre el modal Angular que contiene ngx-dropzone.
   * La promesa se resuelve en true únicamente cuando el usuario confirma
   * con por lo menos un archivo válido.
   */
  abrirModalAprobacionGastos(
    registro: any,
    porcentajeGasto: number,
    porcMaxGasto: number,
    maximoValorGastos: number
  ): Promise<boolean> {

    // Si por algún motivo quedó una validación anterior abierta, se cancela.
    if (this.resolverAprobacion) {
      this.resolverAprobacion(false);
      this.resolverAprobacion = undefined;
    }

    this.registroPendienteAprobacion = registro;
    this.porcentajeGastoPendiente = porcentajeGasto;
    this.porcMaxGastoPendiente = porcMaxGasto;
    this.maximoValorGastosPendiente = maximoValorGastos;

    // Precarga solo los File todavía no enviados al backend.
    // Así, si el ramo se está editando, el usuario puede quitar un respaldo
    // que seleccionó anteriormente antes de guardar definitivamente el PYG.
    this.archivosAprobacionTemp = Array.isArray(registro?.archivosAprobacion)
      ? registro.archivosAprobacion.filter((archivo: any) => archivo instanceof File)
      : [];

    return new Promise<boolean>((resolve) => {
      this.resolverAprobacion = resolve;

      setTimeout(() => {
        $('#modalAprobacionGastos').modal({
          backdrop: 'static',
          keyboard: false
        });
        $('#modalAprobacionGastos').modal('show');
      }, 0);
    });
  }

  /**
   * Recibe los archivos seleccionados en ngx-dropzone.
   */
  onSelectAprobacion(event: any): void {
    const archivosAgregados: File[] = event?.addedFiles ?? [];
    const archivosRechazados: any[] = event?.rejectedFiles ?? [];

    // Solo mostramos un mensaje específico si realmente podemos identificar
    // que el rechazo fue por tamaño o por tipo. Evitamos mostrar
    // "Archivo no permitido" para rechazos sin razón clara.
    if (archivosRechazados.length > 0) {
      const rechazadosPorTamano = archivosRechazados.filter(
        (archivo: any) =>
          archivo?.reason === 'size' ||
          Number(archivo?.size ?? 0) > this.maxArchivoAprobacion
      );

      const rechazadosPorTipo = archivosRechazados.filter(
        (archivo: any) => archivo?.reason === 'type'
      );

      if (rechazadosPorTamano.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Archivo demasiado grande',
          text: 'Cada respaldo puede pesar máximo 20 MB.',
          confirmButtonText: 'Aceptar'
        });
      } else if (rechazadosPorTipo.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Tipo de archivo no permitido',
          text: 'El tipo de uno o más archivos no está permitido.',
          confirmButtonText: 'Aceptar'
        });
      } else {
        console.warn(
          'ngx-dropzone rechazó uno o más archivos sin una razón identificable:',
          archivosRechazados
        );
      }
    }

    archivosAgregados.forEach((archivo: File) => {
      // Doble validación por seguridad.
      if (archivo.size > this.maxArchivoAprobacion) {
        Swal.fire({
          icon: 'warning',
          title: 'Archivo demasiado grande',
          text: `El archivo "${archivo.name}" supera el máximo permitido de 20 MB.`,
          confirmButtonText: 'Aceptar'
        });
        return;
      }

      const yaExiste = this.archivosAprobacionTemp.some(
        (actual: File) =>
          actual.name === archivo.name &&
          actual.size === archivo.size &&
          actual.lastModified === archivo.lastModified
      );

      if (!yaExiste) {
        this.archivosAprobacionTemp.push(archivo);
      }
    });
  }

  /**
   * Permite quitar un archivo seleccionado incorrectamente.
   */
  onRemoveAprobacion(archivo: File): void {
    this.archivosAprobacionTemp = this.archivosAprobacionTemp.filter(
      (item: File) => item !== archivo
    );

  }

  /**
   * Confirma la aprobación y continúa con el flujo normal del ramo.
   */
  confirmarAprobacionGastos(): void {
    if (this.archivosAprobacionTemp.length < 1) {
      Swal.fire({
        icon: 'warning',
        title: 'Respaldo requerido',
        text: 'Debe cargar por lo menos un respaldo de aprobación para continuar.',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const archivoInvalido = this.archivosAprobacionTemp.find(
      (archivo: File) => archivo.size > this.maxArchivoAprobacion
    );

    if (archivoInvalido) {
      Swal.fire({
        icon: 'warning',
        title: 'Archivo demasiado grande',
        text: `El archivo "${archivoInvalido.name}" supera el máximo permitido de 20 MB.`,
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    if (this.registroPendienteAprobacion) {
      this.ingresoConAprobacion(
        this.registroPendienteAprobacion,
        this.archivosAprobacionTemp
      );
    }

    $('#modalAprobacionGastos').modal('hide');

    const resolver = this.resolverAprobacion;
    this.limpiarModalAprobacion();

    // true hace que guardarIngresoGastos()/actualizarIngresoGasto()
    // continúen exactamente con su flujo normal.
    resolver?.(true);
  }

  /**
   * Cancela la aprobación. El usuario vuelve al formulario para reducir gastos.
   */
  cancelarAprobacionGastos(): void {
    $('#modalAprobacionGastos').modal('hide');

    const resolver = this.resolverAprobacion;
    this.limpiarModalAprobacion();

    resolver?.(false);
  }

  private limpiarModalAprobacion(): void {
    this.archivosAprobacionTemp = [];
    this.registroPendienteAprobacion = null;
    this.porcentajeGastoPendiente = 0;
    this.porcMaxGastoPendiente = 0;
    this.maximoValorGastosPendiente = 0;
    this.resolverAprobacion = undefined;
  }

  /**
   * Asocia al ramo la lista actual del dropzone.
   * Los archivos File anteriores se reemplazan por la selección actual,
   * permitiendo que un archivo eliminado deje de enviarse al backend.
   * Cualquier metadata de archivos que ya exista en backend se conserva.
   */
  ingresoConAprobacion(registro: any, archivos: File[]): void {
    const archivosPersistidos = Array.isArray(registro?.archivosAprobacion)
      ? registro.archivosAprobacion.filter((archivo: any) => !(archivo instanceof File))
      : [];

    registro.archivosAprobacion = [
      ...archivosPersistidos,
      ...archivos
    ];

    console.table(
      archivos.map((archivo: File) => ({
        nombre: archivo.name,
        tipo: archivo.type || 'Tipo no informado',
        tamanioMB: Number((archivo.size / (1024 * 1024)).toFixed(2)),
        ultimaModificacion: archivo.lastModified
      }))
    );
  }

  /**
   * Peso acumulado de todos los respaldos seleccionados.
   */
  get totalPesoArchivosAprobacion(): number {
    return this.archivosAprobacionTemp.reduce(
      (total: number, archivo: File) => total + Number(archivo?.size || 0),
      0
    );
  }

  /**
   * Porcentaje usado únicamente para representar visualmente el peso
   * acumulado en la barra. La referencia visual es 100 MB y NO representa
   * un límite de carga total; el límite real continúa siendo 20 MB por archivo.
   */
  get porcentajePesoArchivosAprobacion(): number {
    if (this.maxTotalVisualAprobacion <= 0) {
      return 0;
    }

    const porcentaje =
      (this.totalPesoArchivosAprobacion / this.maxTotalVisualAprobacion) * 100;

    return Math.min(Math.max(porcentaje, 0), 100);
  }

  formatearTamanoArchivo(bytes: number): string {
    if (!bytes || bytes <= 0) {
      return '0 KB';
    }

    const kb = bytes / 1024;

    if (kb < 1024) {
      return `${kb.toFixed(2)} KB`;
    }

    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  }

  /**
   * Acorta visualmente nombres largos dentro del modal de aceptación.
   * El nombre real se conserva completo para visualizar y descargar.
   */
  truncarNombreArchivo(nombre: string, limite: number = 25): string {
    if (!nombre) {
      return '';
    }

    return nombre.length > limite
      ? nombre.substring(0, limite) + '...'
      : nombre;
  }

  calcularRestanteGastosxRamo(gastos: any[], comision: any): number {
    let totalGastos = gastos?.reduce((total, gasto) => total + Number(gasto.valor), 0);
    return comision - totalGastos;
  }
  clienteSeleccionado: any;
  lstRamosSugeridos: any = [];

  // Búsqueda local dentro del modal de ramos sugeridos.
  // No modifica el arreglo original ni la selección de las tarjetas.
  busquedaRamosSugeridos: string = '';

  private normalizarBusquedaRamos(valor: any): string {
    return String(valor == null ? '' : valor)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private fechaBusquedaRamos(valor: any): string {
    const fecha = String(valor == null ? '' : valor).substring(0, 10);
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
    return coincidencia
      ? coincidencia[3] + '/' + coincidencia[2] + '/' + coincidencia[1]
      : fecha;
  }

  get ramosSugeridosFiltrados(): any[] {
    const terminos = this.normalizarBusquedaRamos(this.busquedaRamosSugeridos)
      .split(/\s+/)
      .filter((termino: string) => termino.length > 0);

    if (!terminos.length) {
      return this.lstRamosSugeridos;
    }

    return this.lstRamosSugeridos.filter((ramo: any) => {
      const contenido = this.normalizarBusquedaRamos([
        ramo.nombreRamo,
        ramo.nombreAseguradora,
        ramo.poliza,
        ramo.cdRamo,
        ramo.periodo,
        ramo.fcDesde,
        ramo.fcHasta,
        this.fechaBusquedaRamos(ramo.fcDesde),
        this.fechaBusquedaRamos(ramo.fcHasta),
        ramo.primaMensual,
        ramo.primaAnual
      ].join(' '));

      // Permite buscar varias palabras, incluso de distintos campos.
      return terminos.every((termino: string) => contenido.includes(termino));
    });
  }

  onClienteChange(cliente: any) {
    this.busquedaRamosSugeridos = '';
    this.lstRamosSugeridos = [];
    this.clienteSeleccionado = cliente;//apellidos , nombnres , id
    this.cargarRamosBase(1);

  }
  cargarRamosBase(abrir: number) {

    if (this.clienteSeleccionado?.id) {
      this.loadingService.showLoading();

      this.pygService.obtenerPolizasSugeridas(this.clienteSeleccionado.id)
        .subscribe((res: any) => {
          console.log('res',res);
          if (!res?.resultado || res.resultado.length === 0) {
            this.lstRamosSugeridos = [];
            this.loadingService.hideLoading();
            return;
          }

          const hoy = new Date();

const anioLimite = hoy.getFullYear() - 1;

console.log('Año límite:', anioLimite);

// Obtener únicamente el año de una fecha en formato YYYY-MM-DD
const obtenerAnio = (fecha: any): number => {
  return fecha ? Number(String(fecha).substring(0, 4)) : 0;
};

let polizas = Object.values(
  res.resultado
    .filter((item: any) =>
      obtenerAnio(item.fcDesde) >= anioLimite ||
      obtenerAnio(item.fcHasta) >= anioLimite
    )
    .reduce((acc: any, item: any) => {

      // Identificar cada combinación de póliza y ramo.
      const clave = `${item.poliza}|${item.nmRamo}`;

      // Si existen duplicados, conservar el de
      // fecha de finalización más reciente.
      if (
        !acc[clave] ||
        new Date(item.fcHasta) > new Date(acc[clave].fcHasta)
      ) {
        acc[clave] = item;
      }

      return acc;

    }, {})
);



          this.lstRamosSugeridos = [];
          console.log('polizas',polizas);
          polizas.forEach((element: any) => {

            const fechaBase = new Date(element.fcDesde);

            const fechaDesdeFormateada = fechaBase
              .toLocaleDateString('es-EC')
              .split('/')
              .reverse()
              .join('-');

            const fechaHasta = new Date(fechaBase);

            fechaHasta.setMonth(fechaHasta.getMonth());

            const fechaHastaFormateada = fechaHasta
              .toLocaleDateString('es-EC')
              .split('/')
              .reverse()
              .join('-');

            fechaHasta.setMonth(fechaHasta.getMonth() - 3);

            const fechaAtrasFormateada = fechaHasta
              .toLocaleDateString('es-EC')
              .split('/')
              .reverse()
              .join('-');

            this.pygService.obtenerFacturasProdPagada(
              this.clienteSeleccionado.id,
              element.poliza,
              fechaDesdeFormateada,
              fechaHastaFormateada,
              element.cdRamo,
            )
              .subscribe((res: any) => {
                if (res?.length > 0) {

                  const tiposExcluir = ['C_MAESTRA', 'RENOVACION MST'];

                  const facturasFiltradas = (res.resultado || []).filter(
                    (item: any) => !tiposExcluir.includes(item.tipo)
                  );

                  const mapaRamos = new Map(
                    this.lstRamos.map((r: any) => [r.cdRamo, r.nmRamo])
                  );

                  const mapaAseguradoras2 = new Map(
                    this.lstAseguradoras.map((a: any) => [a.alias, a.id])
                  );

                  const facturasAgrupadas = Object.values(
                    facturasFiltradas.reduce((acc: any, item: any) => {

                      const fecha = new Date(item.fcDesde);
                      const hasta = new Date(fecha);
                      hasta.setFullYear(hasta.getFullYear() + 1);

                      const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

                      if (!acc[clave]) {
                        acc[clave] = {
                          periodo: clave,
                          fcDesde: item.fcDesde,
                          fcHasta: hasta.toISOString(),
                          porcCom: item.pctComBroker,
                          primaMensual: 0,
                          primaAnual: 0,
                          valPrima: 0,
                          comisionMensual: 0,
                          comisionAnual: 0,
                          poliza: item.poliza,
                          registros: [],
                          cdRamo: item.cdRamo,
                          nombreRamo: mapaRamos.get(item.cdRamo) ?? '',
                          nombreAseguradora: item.aseguradora,
                          cdAseguradora: mapaAseguradoras2.get(item.aseguradora) ?? '',
                          seleccionado: false
                        };
                      }

                      acc[clave].primaMensual += Number(item.priNet || 0);
                      acc[clave].primaAnual = Number((acc[clave].primaMensual * 12).toFixed(2));
                      acc[clave].valPrima += Number(item.priNet || 0);
                      acc[clave].registros.push(item);
                      acc[clave].comisionMensual = Number((acc[clave].primaMensual * item.pctComBroker / 100).toFixed(2));
                      acc[clave].comisionAnual = Number(((acc[clave].primaMensual * item.pctComBroker / 100) * 12).toFixed(2));

                      return acc;

                    }, {})
                  );

                  if (facturasAgrupadas.length > 0) {
                    this.lstRamosSugeridos.push(facturasAgrupadas);
                  }

                  this.loadingService.hideLoading();

                } else {

                  this.pygService.obtenerFacturasProdPagada(
                    this.clienteSeleccionado.id,
                    element.poliza,
                    fechaAtrasFormateada,
                    fechaDesdeFormateada,
                    element.cdRamo,
                  )
                    .subscribe((res: any) => {

                      const tiposExcluir = ['C_MAESTRA', 'RENOVACION MST'];

                      const facturasFiltradas = (res?.resultado || []).filter(
                        (item: any) => !tiposExcluir.includes(item.tipo)
                      );

                      if (facturasFiltradas.length === 0) {
                        this.loadingService.hideLoading();
                        return;
                      }

                      const mapaRamos = new Map(
                        this.lstRamos.map((r: any) => [r.cdRamo, r.nmRamo])
                      );

                      const mapaAseguradoras2 = new Map(
                        this.lstAseguradoras.map((a: any) => [a.alias, a.id])
                      );

                      const facturasAgrupadas = Object.values(
                        facturasFiltradas.reduce((acc: any, item: any) => {
                          const fecha = new Date(item.fcDesde);
                          const hasta = new Date(fecha);
                          hasta.setFullYear(hasta.getFullYear() + 1);

                          const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

                          if (!acc[clave]) {
                            acc[clave] = {
                              periodo: clave,
                              fcDesde: item.fcDesde,
                              fcHasta: hasta.toISOString(),
                              porcCom: item.pctComBroker,
                              primaMensual: 0,
                              primaAnual: 0,
                              valPrima: 0,
                              comisionMensual: 0,
                              comisionAnual: 0,
                              poliza: item.poliza,
                              registros: [],
                              cdRamo: item.cdRamo,
                              nombreRamo: mapaRamos.get(item.cdRamo) ?? '',
                              nombreAseguradora: item.aseguradora,
                              cdAseguradora: mapaAseguradoras2.get(item.aseguradora) ?? '',
                              seleccionado: false
                            };
                          }

                          acc[clave].primaMensual += Number(item.priNet || 0);
                          acc[clave].primaAnual = Number((acc[clave].primaMensual * 12).toFixed(2));
                          acc[clave].valPrima += Number(item.priNet || 0);
                          acc[clave].registros.push(item);
                          acc[clave].comisionMensual = Number((acc[clave].primaMensual * item.pctComBroker / 100).toFixed(2));
                          acc[clave].comisionAnual = Number(((acc[clave].primaMensual * item.pctComBroker / 100) * 12).toFixed(2));

                          return acc;

                        }, {})
                      );

                      const registros = (facturasAgrupadas as any[]).sort(
                        (a, b) => new Date(a.fcDesde).getTime() - new Date(b.fcDesde).getTime()
                      );

                      if (registros.length === 0) {
                        this.loadingService.hideLoading();
                        return;
                      }

                      const primas = registros.map(x => x.primaMensual);

                      const promedioPrima =
                        primas.reduce((a, b) => a + b, 0) / primas.length;

                      const promedioComision =
                        registros.reduce((a: number, b: any) => a + b.comisionMensual, 0) /
                        registros.length;

                      const ultimo = registros[registros.length - 1];

                      const resultado = {
                        ...ultimo,
                        primaMensual: Number(promedioPrima.toFixed(2)),
                        primaAnual: Number((promedioPrima * 12).toFixed(2)),
                        valPrima: Number(promedioPrima.toFixed(2)),
                        comisionMensual: Number(promedioComision.toFixed(2)),
                        comisionAnual: Number((promedioComision * 12).toFixed(2)),
                        estadoCrecimiento: 'PROMEDIO'
                      };

                      if (resultado?.registros?.length > 0) {
                        this.lstRamosSugeridos.push(resultado);
                      }

                      this.loadingService.hideLoading();

                    }, (error: any) => {
                      this.loadingService.hideLoading();
                    });
                }

              }, (error: any) => {
                this.loadingService.hideLoading();
              });

          });
          if(polizas.length<1){
            this.loadingService.hideLoading();
          }
        }, (error: any) => {
          this.loadingService.hideLoading();
        });

      if (abrir == 1) {
        $('#modalRamosEstandar').modal('show');
      }
    }
  }
  eliminarIngreso(dato: number) {

    Swal.fire({
      title: '¿Está segur@?',
      text: 'Esta acción eliminará el registro seleccionado.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Elimina el item del array
        this.lstIngresosGastos.splice(dato, 1);
        // Opcional: mostrar mensaje de éxito
        Swal.fire(
          'Eliminado',
          'El registro ha sido eliminado correctamente.',
          'success'
        );
      }
    });
  }
  editarIngresoGasto: boolean = false;
  indexIGActualizar: any;
  idRamoSeleccionado: any;
  ingresoRamoSeleccionado: any = [];
  editarIngreso(index: any) {
    this.indexIGActualizar = index;
    this.editarIngresoGasto = true;
    const ingresoOriginal = this.lstIngresosGastos[index];
    this.ingresoRamoSeleccionado = {
      ...ingresoOriginal,
      gastos: JSON.parse(JSON.stringify(ingresoOriginal.gastos ?? [])),
      facturas: JSON.parse(JSON.stringify(ingresoOriginal.facturas ?? [])),
      // Los File no deben pasar por JSON.stringify porque se convierten en {}.
      archivosAprobacion: [...(ingresoOriginal.archivosAprobacion ?? [])]
    };
    this.idRamoSeleccionado = this.ingresoRamoSeleccionado.idRamo ?? '';
    this.ingresoForm.patchValue({
      // cliente: dato.cliente,
      // nombreCliente: dato.nombreClienete,
      idRamo: this.ingresoRamoSeleccionado.idRamo ?? '',
      ramo: this.ingresoRamoSeleccionado.ramo,
      aseguradora: this.ingresoRamoSeleccionado.aseguradora,
      nombreRamo: this.ingresoRamoSeleccionado.nombreRamo,
      inicioVigencia: this.ingresoRamoSeleccionado.inicioVigencia,
      finVigencia: this.ingresoRamoSeleccionado.finVigencia,
      primaMensual: this.ingresoRamoSeleccionado.primaMensual,
      primaAnual: this.ingresoRamoSeleccionado.primaAnual,
      porcentajeComision: this.ingresoRamoSeleccionado.porcentajeComision,
      comision: this.ingresoRamoSeleccionado.comision,
      comisionAnual: this.ingresoRamoSeleccionado.comisionAnual,
      gastos: this.ingresoRamoSeleccionado.gastos,
      facturas: this.ingresoRamoSeleccionado.facturas,
      poliza: this.ingresoRamoSeleccionado.poliza
    });
    // this.lstGastos = dato.gastos.filter(
    //   (item: any) => !item.idDetalleFact
    // );
  }

  async actualizarIngresoGasto() {
    const ramo = this.lstRamos.find((r: any) => r.cdRamo === this.ingresoForm.value.ramo);
    const aseguradora = this.lstAseguradoras.find((r: any) => r.id == this.ingresoForm.value.aseguradora);

    let ingreso = {
      cliente: this.ingresoForm.getRawValue().cliente,
      nombreCliente: this.clienteSeleccionado?.nombres ?? this.clienteSeleccionado?.NOMBRES ?? '',
      idCliente: this.clienteSeleccionado.id,
      ramo: this.ingresoForm.value.ramo,
      idRamo: this.idRamoSeleccionado,
      nombreRamo: ramo.nmRamo,
      aseguradora: aseguradora.id,
      nombreAseguradora: aseguradora.alias,
      inicioVigencia: this.ingresoForm.value.inicioVigencia,
      finVigencia: this.ingresoForm.value.finVigencia,
      primaMensual: this.ingresoForm.value.primaMensual,
      primaAnual: this.ingresoForm.value.primaAnual,
      porcentajeComision: this.ingresoForm.value.porcentajeComision,
      comision: this.ingresoForm.value.comision,
      comisionAnual: this.ingresoForm.value.comisionAnual,
      gastos: this.ingresoRamoSeleccionado.gastos ?? [],
      facturas: this.ingresoRamoSeleccionado.facturas,
      poliza: this.ingresoForm.value.poliza,
      archivosAprobacion: [...(this.ingresoRamoSeleccionado.archivosAprobacion ?? [])],
      nombresUsuario: (
        (this.userCurrent?.get_persona.nombre ?? '') + ' ' +
        (this.userCurrent?.get_persona.apellido ?? '')
      ).trim()
    };

    const puedeActualizarNormal = this.registroGenerado || this.idRamoSeleccionado ? await this.validarPorcentajeMaximoGasto(ingreso) : true;
    if (!puedeActualizarNormal) {
      return;
    }

    this.lstIngresosGastos[this.indexIGActualizar] = { ...this.ingresoRamoSeleccionado, ...ingreso, idGrupo: this.ingresoRamoSeleccionado.idGrupo ?? null, idGrupoTemporal: this.ingresoRamoSeleccionado.idGrupoTemporal ?? null, idEstado: this.ingresoRamoSeleccionado.idEstado ?? 4 };

    this.limpiarFormIngreso();
    this.toastrService.success(
      'Correcto!',
      'Detalle actualizado correctamente.'
    );
    this.editarIngresoGasto = false;
  }
  cancelarActualizarIG() {
    this.editarIngresoGasto = false;
    this.limpiarFormIngreso();
  }
  getTotalGastos(gastos: any[]): number {
    return gastos?.reduce((total, gasto) => total + Number(gasto.valor), 0);
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

  async generarRegistroPrograma() {
    if (this.lstIngresosGastos.length < 1) {
      this.toastrService.error('ERROR', 'Debe agregar al menos un ramo al detalle.');
      return;
    }
    if (this.programaAnteriorEdicion?.idGrupo != null) {
      // El nombre de un registro guardado no se puede modificar.
      this.nombrePrograma = this.programaAnteriorEdicion.nombre;
    } else if (this.lstIngresosGastos.length > 1) {
      const resultado = await Swal.fire({
        title: 'Nombre del programa o grupo de ramos',
        input: 'text',
        inputValue: this.indiceProgramaEdicion !== null ? this.nombrePrograma : '',
        inputPlaceholder: 'Ingrese el nombre del programa',
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        inputValidator: (valor) => !valor?.trim() ? 'Ingrese el nombre del programa.' : null
      });
      if (!resultado.isConfirmed) return;
      this.nombrePrograma = resultado.value.trim();
    } else {
      this.nombrePrograma = this.lstIngresosGastos[0].nombreRamo;
    }
    const registroConsolidado = {
      comisionAnual: this.totalIngresos,
      gastos: this.lstGastos,
      archivosAprobacion: this.lstIngresosGastos[0].archivosAprobacion || []
    };
    const autorizado = await this.validarPorcentajeMaximoGasto(registroConsolidado);
    if (!autorizado) return;
    this.lstIngresosGastos.forEach((ramo: any, i: number) => {
      ramo.gastos = i === 0 ? [...this.lstGastos] : [];
      ramo.nombrePrograma = this.nombrePrograma;
      if (i === 0) ramo.archivosAprobacion = registroConsolidado.archivosAprobacion;
    });
    const idEstado = this.programaAnteriorEdicion?.idGrupo != null ? this.programaAnteriorEdicion.idEstado : (this.obtenerExcesoPresupuesto(registroConsolidado).excedido ? 1 : 4);
    const programaGenerado = {
      idGrupo: this.programaAnteriorEdicion?.idGrupo ?? null,
      idGrupoTemporal: this.programaAnteriorEdicion?.idGrupoTemporal ?? (this.programaAnteriorEdicion?.idGrupo != null ? null : this.generarIdGrupoTemporal()),
      nombre: this.nombrePrograma,
      idEstado: idEstado,
      ramos: this.lstIngresosGastos.map((ramo: any) => ({ ...ramo, idEstado: idEstado, gastos: [...(ramo.gastos || [])], archivosAprobacion: [...(ramo.archivosAprobacion || [])] }))
    };
    programaGenerado.ramos.forEach((ramo: any) => {
      ramo.idGrupo = programaGenerado.idGrupo;
      ramo.idGrupoTemporal = programaGenerado.idGrupoTemporal;
    });
    if (this.indiceProgramaEdicion !== null) this.programasGenerados.splice(this.indiceProgramaEdicion, 0, programaGenerado);
    else this.programasGenerados.push(programaGenerado);
    this.indiceProgramaEdicion = null;
    this.programaAnteriorEdicion = null;
    this.lstIngresosGastos = [];
    this.lstGastos = [];
    this.gastoForm.reset({ descripcion: '', valor: null, cantidad: 1 });
    this.limpiarFormIngreso();
    this.nombrePrograma = '';
    this.registroGenerado = false;
    this.toastrService.success('Correcto!', 'Programa agregado. Puede ingresar otro registro.');
  }
  guardarPYG() {
    if (this.guardandoRegistrosPYG) return;
    if (this.programasGenerados.length < 1) {
      this.toastrService.error('ERROR', 'Primero debe generar el registro con sus ramos y gastos.');
      return;
    }
    if (this.ingresoForm.invalid && this.programasGenerados.length < 1 && this.lstIngresosGastos.length < 1) {
      this.toastrService.error('ERROR', 'Debe ingresar por lo menos 1 detalle de gastos!');
      this.appComponent.validateAllFormFields(this.ingresoForm);
      const camposInvalidos = this.obtenerCamposInvalidos();

      this.toastrService.error(
        'Error al enviar PYG',
        'No se llenaron todos los campos necesarios.'
      );
      return;
    }
    if (!this.ingresoForm.getRawValue().cliente) {
      this.toastrService.error('ERROR', 'Debe ingresar/seleccionar un cliente!');
      return;
    }
    if (this.lstIngresosGastos.length > 0) {
      this.toastrService.error('ERROR', 'Existen ramos pendientes. Genere ese registro antes de guardar.');
      return;
    }
    if (this.programasGenerados.length < 1 && this.lstIngresosGastos.length < 1) return;


    let formD = new FormData();
    formD.append('idRegistro', this.ingresoForm.value.id ?? '');
    formD.append('cliente', JSON.stringify(this.ingresoForm.getRawValue().cliente));
    formD.append('aseguradora', String(this.ingresoForm.value.aseguradora ?? ''));
    formD.append('nombreCliente', this.clienteSeleccionado.nombres ?? this.clienteSeleccionado.NOMBRES);
    formD.append('idCliente', this.clienteSeleccionado.id);
    formD.append('idUsuario', this.userCurrent.id);
    formD.append('porcMaxgasto', String(this.userCurrent?.porcMaxgasto ?? ''));

    // Los objetos File no deben viajar dentro de JSON.stringify.
    // Se agregan al FormData como archivos reales y se relacionan
    // con cada ramo mediante el índice de lstIngresosGastos.
    const programasModificados = this.obtenerProgramasGuardado();
    if (programasModificados.length === 0) {
      this.toastrService.info('Sin cambios', 'No existen registros PYG modificados para guardar.');
      return;
    }
    // En estado 2, si la corrección no supera el porcentaje máximo,
    // el registro queda aprobado (4); si lo supera, vuelve a revisión (1).
    // El servidor recalculará esta regla con los datos guardados.
    const programasGuardar = programasModificados.map((programa: any) => {
      const estadoActual = Number(programa.idEstado ?? 4);
      const nuevoEstado = programa.idGrupo != null && estadoActual === 2
        ? (this.presupuestoPrograma(programa).excedido ? 1 : 4)
        : programa.idGrupo != null && estadoActual === 4
          ? (this.presupuestoPrograma(programa).excedido ? 1 : 4)
          : estadoActual;
      return {
        ...programa,
        idEstado: nuevoEstado,
        ramos: (programa.ramos || []).map((ramo: any) => ({ ...ramo, idEstado: nuevoEstado }))
      };
    });
    const ramosGuardar = programasGuardar.reduce((ramos: any[], programa: any) => {
      const esPrograma = programa.ramos.length > 1;
      programa.ramos.forEach((ramo: any) => {
        ramos.push({
          ...ramo,
          idGrupo: programa.idGrupo ?? null,
          idGrupoTemporal: programa.idGrupoTemporal ?? null,
          tipoRegistro: esPrograma ? 'Programa' : 'Individual',
          nombrePrograma: esPrograma ? programa.nombre : ramo.nombreRamo,
          idEstado: programa.idEstado ?? ramo.idEstado ?? 4
        });
      });
      return ramos;
    }, []);
    const ingresosParaEnviar = ramosGuardar.map(
      (ingreso: any, indexRamo: number) => {
        const archivos = Array.isArray(ingreso.archivosAprobacion)
          ? ingreso.archivosAprobacion
          : [];

        const metadataArchivos = archivos.map((archivo: any, indexArchivo: number) => {
          if (archivo instanceof File) {
            formD.append(
              `archivosAprobacion[${indexRamo}][]`,
              archivo,
              archivo.name
            );

            return {
              indexArchivo,
              nombre: archivo.name,
              tipo: archivo.type || null,
              tamanio: archivo.size,
              esNuevo: true
            };
          }

          // Si el backend ya devolvió respaldos previamente guardados,
          // conserva su información/ruta en el JSON.
          return {
            ...archivo,
            indexArchivo,
            esNuevo: false
          };
        });

        return {
          ...ingreso,
          archivosAprobacion: metadataArchivos
        };
      }
    );

    formD.append('lstIngresosGastos', JSON.stringify(ingresosParaEnviar));
    formD.append('nombrePrograma', programasGuardar.length === 1 ? programasGuardar[0].nombre : 'Varios programas');
    formD.append('programas', JSON.stringify(programasGuardar.map((programa: any) => ({
      idGrupo: programa.idGrupo ?? null,
      idGrupoTemporal: programa.idGrupoTemporal ?? null,
      nombre: programa.ramos.length > 1 ? programa.nombre : programa.ramos[0]?.nombreRamo,
      tipoRegistro: programa.ramos.length > 1 ? 'Programa' : 'Individual',
      idEstado: programa.idEstado ?? programa.ramos[0]?.idEstado ?? 4,
      ramos: programa.ramos.map((ramo: any) => ramo.ramo)
    }))));
    this.guardandoRegistrosPYG = true;
    this.mostrarProcesandoPYG('Guardando registros PYG', 'Procesando, espere mientras se guardan los cambios...');
    this.pygService.guardarPYG(formD).subscribe({
      next: (res: any) => {
        this.guardandoRegistrosPYG = false;
        Swal.close();
        if (res?.ok === false || (res?.status != null && Number(res.status) >= 400)) {
          Swal.fire({
            icon: 'error',
            title: 'No se pudo guardar',
            text: res?.mensaje || 'El servidor no confirmó la operación.'
          });
          return;
        }
        Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: 'PYG guardado Correctamente',
          confirmButtonText: 'OK',
          allowOutsideClick: false,
          allowEscapeKey: false,
          allowEnterKey: true,
          showCloseButton: false
        }).then((result) => {
          if (result.isConfirmed) {
            this.router.navigate(['/home/pyg/seguimiento']);
          }
        });
      },
      error: (error: any) => {
        this.guardandoRegistrosPYG = false;
        Swal.close();
        this.loadingService.hideLoading();
        Swal.fire({
          icon: 'error',
          title: 'Error al guardar',
          text: error?.error?.mensaje || 'No se pudo actualizar el registro.'
        });
      }
    });
  }

  lstRamosCargados: any = [];
  lstAniosCargados: any = [];
  selectRamo: any = 999;
  selectVigencia: any;
  get ramosGuardados(): any[] {
    return this.programasGenerados.reduce((todos: any[], programa: any) => todos.concat(programa.ramos || []), []);
  }
  tieneFacturas(): boolean {
    return this.ramosGuardados.some((item: any) => item.facturas?.length > 0);
  }
  cargarDatosRegistro() {
    this.registroRevisionOriginal = null;
    this.accionRevisionPYG = 'aprobar';
    this.lstFacturasBorradas = [];
    this.lstIngresosGastos = [];
    this.lstGastos = [];
    this.programasGenerados = [];
    this.registrosOriginalesPYG.clear();
    this.registroGenerado = true;
    this.clienteSeleccionado = this.clienteSeleccionado ?? {};
    this.loadingService.showLoading();
    //if (this.esFinanciero) {
    let formD = new FormData();
    formD.append('idRegistro', String(this.idRegistro ?? ''));
    formD.append('ramo', '999');
    formD.append('vigencia', '');
    if (this.clienteSeleccionado?.id != null) formD.append('cliente', String(this.clienteSeleccionado.id));

    const consultaRegistro$ = this.modoDetalleRegistro
      ? this.pygService.obtenerRegistrosPYGbyID(String(this.idRegistro))
      : this.pygService.obtenerRegistrosPYGFinanciero(formD);

    consultaRegistro$.subscribe((res: any) => {
      let respuesta = res.data;
      this.registroRevisionOriginal = respuesta ?? null;

      if (!respuesta) {
        this.loadingService.hideLoading();
        this.toastrService.error('ERROR', 'No se encontraron datos del registro!');
        return;
      }
      if (respuesta) {
        this.clienteSeleccionado.nombres = respuesta.cliente;
        this.clienteSeleccionado.NOMBRES = respuesta.cliente;
        this.clienteSeleccionado.id = respuesta.idCliente;
        this.objCliente = {
          id: respuesta.idCliente,
          nombre: respuesta.cliente
        }
      }

      this.ingresoForm.patchValue({
        id: respuesta.id,
        cliente: respuesta.cliente ?? '',
      });
      const gruposCargados = new Map<string, any>();
      (respuesta.ramos || []).forEach((element: any) => {
        // para las listas 
        let nombreRamo = this.lstRamos.find((item: any) => item.cdRamo == element.ramo)?.nmRamo ?? String(element.ramo);
        let nombreAseguradora = this.lstAseguradoras.find((r: any) => r.id == element.aseguradora)?.alias ?? String(element.aseguradora);
        let ingreso = {
          idIngreso: element.idRegistro ?? respuesta.id ?? '',
          cliente: respuesta.idCliente ?? '',
          nombreCliente: respuesta.cliente ?? '',
          ramo: element.ramo ?? '',
          idRamo: element.idRegistroReg ?? '',
          idGrupo: element.idRegistro ?? null,
          idGrupoTemporal: null,
          idEstado: element.estado ?? respuesta.estado ?? 4,
          nombrePrograma: element.nombreGrupo || nombreRamo,
          aseguradora: element.aseguradora ?? '',
          nombreAseguradora: nombreAseguradora ?? '',
          nombreRamo: nombreRamo ?? '',
          inicioVigencia: element.inicioVigencia ?? '',
          finVigencia: element.finVigencia ?? '',
          primaMensual: element.primaMensual ?? '',
          primaAnual: element.primaMensual
            ? element.primaMensual * 12
            : '',
          porcentajeComision: element.comision ?? '',
          comision: element.primaMensual != null && element.comision != null
            ? (element.primaMensual * element.comision) / 100
            : 0,
          comisionAnual: element.comision
            ? (element.primaMensual * element.comision) / 100 * 12
            : '',
          gastos: element.gastos ?? [],
          facturas: element.facturas ?? [],
          archivosAprobacion: element.archivosAprobacion ?? [],
          nombresUsuario: element.nombresUsuario ?? '',
          poliza: element.poliza ?? '',
          //adicionales
          proyeccion: [] as any[],
          totalPrima: 0,
          totalComision: 0,
          mesesFacturados: 0,
          mesesRestantes: 0,
          proyeccionPrima: 0,
          proyeccionComision: 0,
          mesRevision: ''
        }
        if (!this.modoDetalleRegistro) {
          this.consultarFacturasProyeccion(
            ingreso.cliente,
            ingreso.poliza,
            ingreso.inicioVigencia,
            ingreso.finVigencia,
            ingreso.ramo
          ).subscribe((facturas: any[]) => {
            ingreso.proyeccion = facturas;
            ingreso.totalPrima = facturas.reduce(
              (sum: number, p: any) => sum + Number(p.priNet || 0),
              0
            );

            ingreso.totalComision = facturas.reduce(
              (sum: number, p: any) => sum + Number(p.valcombroker || 0),
              0
            );

            ingreso.mesesFacturados = facturas.length;
            ingreso.mesesRestantes = 12 - ingreso.mesesFacturados;

            ingreso.proyeccionPrima =
              ingreso.mesesFacturados > 0
                ? (ingreso.totalPrima / ingreso.mesesFacturados) * ingreso.mesesRestantes
                : 0;

            ingreso.proyeccionComision =
              ingreso.mesesFacturados > 0
                ? (ingreso.totalComision / ingreso.mesesFacturados) * ingreso.mesesRestantes
                : 0;
          });
        }
        ingreso.mesRevision = this.obtenerMesVigencia(
          element.inicioVigencia,
          element.finVigencia
        ).toUpperCase();
        const idGrupo = ingreso.idGrupo;
        const claveGrupo = String(idGrupo ?? ingreso.idRamo);
        if (!gruposCargados.has(claveGrupo)) {
          gruposCargados.set(claveGrupo, {
            idGrupo: idGrupo,
            idGrupoTemporal: null,
            nombre: element.nombreGrupo || ingreso.nombreRamo,
            idEstado: ingreso.idEstado,
            ramos: []
          });
        }
        gruposCargados.get(claveGrupo).ramos.push(ingreso);
      });
      this.programasGenerados = Array.from(gruposCargados.values());
      // Guardar estado original ANTES de cualquier edición del usuario.
      this.guardarFotografiaRegistrosPYG();
      this.actualizarOpcionesFiltroGrupos();
      this.lstIngresosGastos = [];
      this.lstGastos = [];
      //consulto las facturas
      if (this.modoDetalleRegistro && !this.esFinanciero) {
        this.loadingService.hideLoading();
        return;
      }
      let formd = new FormData();
      formd.append('idCliente', respuesta.idCliente);
      this.pygService.obtenerFacturasPYG(formd).subscribe((res: any) => {
        this.lstFacturasCliente = res.data;
        this.lstFacturasCliente = Array.from(
          new Map(this.lstFacturasCliente.map((item: any) => [item.id, item])).values()
        );
        this.cargarTablaFacturas();
      }, (error: any) => {
        this.loadingService.hideLoading();
        this.toastrService.error('ERROR', 'No se pudo cargar el registro!');
        this.router.navigate(['/home/pyg/seguimiento']);
      });

    }, (error: any) => {
      this.loadingService.hideLoading();
      this.toastrService.error('ERROR', 'No se pudo cargar el registro!');
      this.router.navigate(['/home/pyg/seguimiento']);
    });
    setTimeout(() => {
      if (!this.modoDetalleRegistro) this.cargarRamosBase(0);
      this.loadingService.hideLoading();
    }, 1000);
  }

  /**
   * Compara la producción de cada mes con los valores mensuales del ramo.
   * El ingreso del PYG depende de la comisión: se toma como referencia
   * principal la comisión mensual registrada; si no existe, la prima mensual.
   * No se comparan los meses entre sí ni se alteran los valores facturados.
   */
  obtenerTendenciaProduccion(proy: any, ing: any): 'aumenta' | 'disminuye' | 'mantiene' {
    const comisionBase = this.convertirANumero(ing?.comision);
    const primaBase = this.convertirANumero(ing?.primaMensual);
    const compararComision = comisionBase !== 0;
    const valorBase = compararComision ? comisionBase : primaBase;
    const valorMes = compararComision
      ? this.convertirANumero(proy?.valcombroker)
      : this.convertirANumero(proy?.priNet);

    // Comparación en centavos para evitar falsas variaciones por decimales.
    const variacionCentavos = Math.round(valorMes * 100) - Math.round(valorBase * 100);
    if (variacionCentavos > 0) return 'aumenta';
    if (variacionCentavos < 0) return 'disminuye';
    return 'mantiene';
  }

  /** Muestra ambos valores registrados y facturados al pasar sobre el icono. */
  obtenerDetalleTendenciaProduccion(proy: any, ing: any): string {
    const moneda = (valor: any): string => '$' + this.convertirANumero(valor).toLocaleString('es-EC', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
    const referencia = this.convertirANumero(ing?.comision) !== 0
      ? 'comisión mensual' : 'prima neta mensual';
    return [
      `Prima neta mensual del ramo: ${moneda(ing?.primaMensual)}`,
      `Prima neta facturada del mes: ${moneda(proy?.priNet)}`,
      `Comisión mensual del ramo: ${moneda(ing?.comision)}`,
      `Comisión facturada del mes: ${moneda(proy?.valcombroker)}`,
      `El indicador compara la ${referencia} registrada con la facturada.`
    ].join('\n');
  }

  consultarFacturasProyeccion(
    idCliente: any,
    poliza: any,
    fcDesde: any,
    fcHasta: any,
    cdRamo:any
  ) {
    return this.pygService
      .obtenerFacturasProdPagada(idCliente, poliza, fcDesde, fcHasta, cdRamo)
      .pipe(
        map((res: any) => {
          const tiposExcluir = ['C_MAESTRA', 'RENOVACION MST'];

          // Validar que la respuesta contenga un arreglo
          const resultado = Array.isArray(res?.resultado)
            ? res.resultado
            : [];
          
          const facturasFiltradas = resultado.filter(
            (item: any) =>
              item && !tiposExcluir.includes(item.tipo) && item.priNet!=0
          );
          console.log('facturasFiltradas',facturasFiltradas);
          // Agrupar por año y mes
          const agrupadas = facturasFiltradas.reduce(
            (acc: any, item: any) => {


              if (!item.fcDesde) {
                return acc;
              }

              const fecha = new Date(item.fcDesde);

              // Evitar fechas inválidas
              if (isNaN(fecha.getTime())) {
                return acc;
              }

              const clave = `${fecha.getFullYear()}-${String(
                fecha.getMonth() + 1
              ).padStart(2, '0')}`;

              if (!acc[clave]) {
                acc[clave] = {
                  periodo: clave,
                  nmRamo: item.nmRamo,
                  fcdesde: item.fcDesde,
                  fchasta: item.fcHasta,
                  priNet: 0,
                  valcombroker: 0,
                  registros: [],
                  facturas: []
                };
              }
                            if(item.poliza == '3785-A'){
              console.log('item',item);
              console.log('item',item.priNet);
                   console.log('acc[clave].priNet',acc[clave].priNet);
              }
         
              acc[clave].priNet += Number(item.priNet) || 0;
              acc[clave].valcombroker += Number(item.valComBroker) || 0;
              acc[clave].registros.push(item);

              // Agregar factura evitando duplicados
              if (
                item.numFactura &&
                !acc[clave].facturas.includes(item.numFactura)
              ) {
                acc[clave].facturas.push(item.numFactura);
              }
              return acc;
            },
            {}
          );

          // Siempre retornar un arreglo, aunque no existan datos
          return Object.values(agrupadas);
        })
      );
  }

  asignarFacturaGastoPrograma(programa: any, gasto: any): void {
    if (this.obtenerIdEstadoPrograma(programa) !== 4) {
      Swal.fire({
        icon: 'warning',
        title: 'Pendiente de aprobación',
        text: 'Para agregar detalle de facturas debe aprobarse primero.',
        confirmButtonText: 'Aceptar'
      });
      return;
    }
    const ramo = programa?.ramos?.find((item: any) => (item.gastos || []).some((g: any) => g === gasto || (g.id != null && g.id === gasto.id))) || programa?.ramos?.[0];
    const index = this.ramosGuardados.indexOf(ramo);
    if (index < 0 || gasto?.id == null) {
      this.toastrService.warning('Aviso', 'El gasto debe estar guardado antes de asignar una factura.');
      return;
    }
    this.asignarFacturas(index, gasto.id);
  }
  idGastoSeleccionado: any = '';
  asignarFacturas(id: any, idGasto?: any) {
    const ramo = this.ramosGuardados[id];
    const programa = this.programasVisualizados.find((item: any) => (item.ramos || []).includes(ramo));
    if (!programa || this.obtenerIdEstadoPrograma(programa) !== 4) {
      Swal.fire({
        icon: 'warning',
        title: 'Pendiente de aprobación',
        text: 'Para agregar detalle de facturas debe aprobarse primero.',
        confirmButtonText: 'Aceptar'
      });
      return;
    }
    this.ramoSeleccionado = ramo;
    if (idGasto) {
      this.idGastoSeleccionado = idGasto;
    } else {
      this.idGastoSeleccionado = '';
    }
    $('#modalFacturas').modal('show');
  }

  seleccionarFactura(id: any) {

    let factura = this.lstFacturasCliente.find(
      (element: any) => element.id == id
    );
    if (!factura) {
      return;
    }

    const agregarFactura = () => {

      factura.seleccionado = 1;

      let detFactura = {
        idRamo: this.ramoSeleccionado.idRamo,
        descripcion: factura.observacion ?? (factura.nombre_cuenta + ' ' + factura.nombre),
        valor: factura.base_con_iva ?? factura.valor_debe,//asientos contables se pone el valor debe
        idDetalleFact: factura.id,
        fechaFactura: factura.fecha_emision ?? factura.fecha,
        numero_documento: factura.numero_documento,
        idGasto: this.idGastoSeleccionado
      };

      // Mantener relación con ramo
      if (!this.ramoSeleccionado.facturas) {
        this.ramoSeleccionado.facturas = [];
      }

      this.ramoSeleccionado.facturas.push(detFactura);


      // NUEVO: Mostrar también en detalle de gastos
      if (!this.idGastoSeleccionado) this.ramoSeleccionado.gastos = this.ramoSeleccionado.gastos || [];
      if (!this.idGastoSeleccionado) this.ramoSeleccionado.gastos.push({
        descripcion: factura.observacion,
        valor: factura.base_con_iva,
        cantidad: 1,
        fecha: factura.fecha_emision,
        tipo: 'Factura',
        idDetalleFact: factura.id,
        numero_documento: factura.numero_documento
      });


      this.refrescarTablaFacturas();

      this.toastrService.success(
        'Correcto!',
        'Factura agregada correctamente al detalle de gastos.'
      );

    };


    if (factura.factura_registrada == 1) {

      Swal.fire({
        icon: 'warning',
        title: 'Factura ya registrada',
        text: 'Esta factura ya se encuentra atada a un detalle de gastos. ¿Desea volverla a ingresar?',
        showCancelButton: true,
        confirmButtonText: 'Aceptar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        allowOutsideClick: false,
        allowEscapeKey: false,
        reverseButtons: true

      }).then((result) => {

        if (result.isConfirmed) {
          agregarFactura();
        }

      });

    } else {

      agregarFactura();

    }

  }
  GetSpanishLanguage() {
    return SpanishLanguage;
  }
  buscarOtros(numeroFactura: string) {
    this.loadingService.showLoading();
    let formd = new FormData();
    formd.append('numeroFactura', numeroFactura);
    this.pygService.obtenerFacturasPYGFactura(formd).subscribe((res: any) => {
      setTimeout(() => {
        if (res.data.length > 0) {
          this.toastrService.success(
            'Correcto!',
            'Datos obtenidos correctamente.'
          );
        } else {
          this.toastrService.warning(
            'Aviso!',
            'No se obtuvieron registros con la factura ingresada.'
          );
        }
        this.loadingService.hideLoading();
        this.lstFacturasCliente = [
          ...res.data.filter(
            (n: any) => !this.lstFacturasCliente.some((o: any) => o.id == n.id)
          ),
          ...this.lstFacturasCliente
        ];
        // Refrescar tabla
        this.refrescarTablaFacturas();
      }, 1500);
    }, (error: any) => {
      this.loadingService.hideLoading();
      this.toastrService.error('ERROR', 'No se pudo obtener informacion con la factura ingresada!');
      this.router.navigate(['/home/pyg/seguimiento']);
    });
  }
  quitarFactura(facturas: any, ing: any, index: any) {
    if (facturas.id) {
      Swal.fire({
        title: 'Factura ya guardada',
        text: 'Esta factura ya se encuentra guardada. ¿Está segur@ de quitarla de este registro de PYG?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, quitar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d'
      }).then((result) => {
        if (result.isConfirmed) {
          // Aquí ejecutas tu lógica para quitar la factura
          let factEscogida = ing.facturas[index];
          if (factEscogida?.idDetalleFact) {
            //actualizar el estado seleccionado
            let factura = this.lstFacturasCliente.find((element: any) => element.id == facturas.idDetalleFact);
            if (factura) {
              factura.seleccionado = 0;
              ing.facturas = ing.facturas.filter(
                (item: any) => item.idDetalleFact != facturas.idDetalleFact
              );
            }
          } else {
            const idFactura = ing.facturas[index]?.id;

            if (idFactura != null) {
              this.lstFacturasBorradas.push(idFactura);
              ing.facturas = ing.facturas.filter(
                (_: any, i: number) => i !== index
              );
            }

          }

          this.refrescarTablaFacturas();
          const factura = this.lstFacturasCliente.find(
            (x: any) => x.numero_documento == facturas?.numero_documento
          );
          if (factura) {
            factura.factura_registrada = 0;
          }
          Swal.fire({
            title: 'Factura quitada',
            text: 'Factura quitada. Recuerde guardar para aplicar todos los cambios.',
            icon: 'success',
            confirmButtonText: 'Entendido'
          });
        }
      });
    } else {
      let factEscogida = ing.facturas[index];
      if (factEscogida?.idDetalleFact) {
        //actualizar el estado seleccionado
        let factura = this.lstFacturasCliente.find((element: any) => element.id == facturas.idDetalleFact);
        if (factura) {
          factura.seleccionado = 0;
          ing.facturas = ing.facturas.filter(
            (item: any) => item.idDetalleFact != facturas.idDetalleFact
          );
        }
      } else {
        const idFactura = ing.facturas[index]?.id;
        if (idFactura != null) {
          this.lstFacturasBorradas.push(idFactura);
          ing.facturas = ing.facturas.filter(
            (_: any, i: number) => i !== index
          );
        } else {
          ing.facturas = ing.facturas.filter(
            (_: any, i: number) => i !== index
          );
        }

      }

      this.refrescarTablaFacturas();
    }


  }
  refrescarTablaFacturas() {
    const table = $('#tablaseg').DataTable();

    table.clear();
    table.rows.add(
      this.lstFacturasCliente.filter((x: any) => x.seleccionado === 0)
    );
    table.draw();
  }
  lstFacturasBorradas: any = [];
  guardarPyGFacturas() {
    let formD = new FormData();
    formD.append('datos', JSON.stringify(this.ramosGuardados));
    formD.append('facturasBorradas', this.lstFacturasBorradas);
    this.pygService.guardarFacturasPYG(formD).subscribe((res: any) => {
      Swal.fire({
        title: 'Guardado correctamente',
        text: 'El detalle de PYG y facturas se ha guardado correctamente.',
        icon: 'success',
        confirmButtonText: 'Aceptar',
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.reload();
        }
      });
    }, (error: any) => {
      this.loadingService.hideLoading();
      this.toastrService.error('ERROR', 'No se pudo guardar la informacion!');
      this.router.navigate(['/home/pyg/seguimiento']);
    });
  }
  obtenerRango(
    filaInicio: number,
    colInicio: number,
    filaFin: number,
    colFin: number
  ): string[] {
    const celdas: string[] = [];

    for (let r = filaInicio - 1; r <= filaFin - 1; r++) {
      for (let c = colInicio; c <= colFin; c++) {
        celdas.push(XLSX.utils.encode_cell({ r, c }));
      }
    }

    return celdas;
  }
  aplicarEstiloRangoMerge(
    ws: XLSX.WorkSheet,
    filaInicio: number,
    colInicio: number,
    filaFin: number,
    colFin: number,
    style: any
  ): void {
    for (let r = filaInicio - 1; r <= filaFin - 1; r++) {
      for (let c = colInicio; c <= colFin; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });

        if (!ws[cellRef]) {
          ws[cellRef] = {
            t: 's',
            v: ''
          };
        }

        ws[cellRef].s = {
          ...(ws[cellRef].s || {}),
          ...style,
          border: this.bordeCompleto()
        };
      }
    }
  }
  bordeCompleto(): any {
    return {
      top: {
        style: 'thin',
        color: { rgb: '000000' }
      },
      bottom: {
        style: 'thin',
        color: { rgb: '000000' }
      },
      left: {
        style: 'thin',
        color: { rgb: '000000' }
      },
      right: {
        style: 'thin',
        color: { rgb: '000000' }
      }
    };
  }
  estiloTituloPrincipal(): any {
    return {
      font: {
        bold: true,
        sz: 14,
        color: { rgb: '000000' }
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center'
      },
      fill: {
        fgColor: { rgb: 'FFFFFF' }
      },
      border: this.bordeCompleto()
    };
  }
  estiloTituloRamo(): any {
    return {
      font: {
        bold: true,
        sz: 11,
        color: { rgb: '0066FF' }
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center'
      },
      fill: {
        fgColor: { rgb: 'EAF3FF' }
      },
      border: this.bordeCompleto()
    };
  }
  estiloSubtitulo(): any {
    return {
      font: {
        sz: 9,
        color: { rgb: '44546A' }
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center'
      },
      border: this.bordeCompleto()
    };
  }
  estiloHeaderAzul(): any {
    return {
      font: {
        bold: true,
        color: { rgb: '003A8C' }
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center'
      },
      fill: {
        fgColor: { rgb: 'DDEEFF' }
      },
      border: this.bordeCompleto()
    };
  }
  estiloNormal(): any {
    return {
      alignment: {
        vertical: 'center'
      },
      border: this.bordeCompleto()
    };
  }
  estiloMonedaVerde(): any {
    return {
      font: {
        bold: true,
        color: { rgb: '00A651' }
      },
      alignment: {
        horizontal: 'right',
        vertical: 'center'
      },
      border: this.bordeCompleto()
    };
  }
  estiloMonedaAzul(): any {
    return {
      font: {
        bold: true,
        color: { rgb: '0066FF' }
      },
      alignment: {
        horizontal: 'right',
        vertical: 'center'
      },
      fill: {
        fgColor: { rgb: 'EAF3FF' }
      },
      border: this.bordeCompleto()
    };
  }
  estiloMonedaRoja(): any {
    return {
      font: {
        bold: true,
        color: { rgb: 'DC3545' }
      },
      alignment: {
        horizontal: 'right',
        vertical: 'center'
      },
      fill: {
        fgColor: { rgb: 'FDECEF' }
      },
      border: this.bordeCompleto()
    };
  }
  estiloPorcentaje(): any {
    return {
      font: {
        bold: true,
        color: { rgb: 'F0A000' }
      },
      alignment: {
        horizontal: 'right',
        vertical: 'center'
      },
      fill: {
        fgColor: { rgb: 'FFF8E1' }
      },
      border: this.bordeCompleto()
    };
  }
  estiloTotalFinal(): any {
    return {
      font: {
        bold: true,
        color: { rgb: '000000' }
      },
      alignment: {
        horizontal: 'right',
        vertical: 'center'
      },
      fill: {
        fgColor: { rgb: 'F2F4F7' }
      },
      border: this.bordeCompleto()
    };
  }
  aplicarBordesSoloConContenido(
    ws: XLSX.WorkSheet,
    filaInicio: number,
    colInicio: number,
    filaFin: number,
    colFin: number
  ): void {
    for (let r = filaInicio - 1; r <= filaFin - 1; r++) {
      for (let c = colInicio; c <= colFin; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellRef];

        if (!cell) continue;

        const tieneContenido =
          cell.v !== undefined &&
          cell.v !== null &&
          String(cell.v).trim() !== '';

        if (!tieneContenido) continue;

        cell.s = {
          ...(cell.s || {}),
          border: this.bordeCompleto()
        };
      }
    }
  }

  aplicarFormatoMoneda(
    ws: XLSX.WorkSheet,
    fila: number,
    col: number,
    estilo?: any
  ): void {
    const cellRef = XLSX.utils.encode_cell({
      r: fila - 1,
      c: col
    });

    if (!ws[cellRef]) {
      ws[cellRef] = {
        t: 'n',
        v: 0
      };
    }

    ws[cellRef].z = '$#,##0.00';

    ws[cellRef].s = {
      ...(ws[cellRef].s || {}),
      ...(estilo || {}),
      border: this.bordeCompleto()
    };
  }
  aplicarFormatoPorcentaje(
    ws: XLSX.WorkSheet,
    fila: number,
    col: number,
    estilo?: any
  ): void {
    const cellRef = XLSX.utils.encode_cell({
      r: fila - 1,
      c: col
    });

    if (!ws[cellRef]) {
      ws[cellRef] = {
        t: 'n',
        v: 0
      };
    }

    ws[cellRef].z = '0.00%';

    ws[cellRef].s = {
      ...(ws[cellRef].s || {}),
      ...(estilo || {}),
      border: this.bordeCompleto()
    };
  }

  /**
   * Descarga los movimientos originales del servicio de producción para
   * este ramo/póliza. No exporta el resumen mensual ni los totales del PYG.
   * Cada periodo de ing.proyeccion conserva los elementos JSON sin modificar
   * en su propiedad `registros` (consultarFacturasProyeccion).
   */
  exportarFacturasProduccionRamo(ing: any): void {
    const proyeccion: any[] = Array.isArray(ing?.proyeccion) ? ing.proyeccion : [];

    // Recuperar cada fila JSON individual, sin sumar, agrupar ni recalcular.
    const movimientosOriginales: any[] = [];
    proyeccion.forEach((periodo: any) => {
      if (Array.isArray(periodo?.registros)) {
        periodo.registros.forEach((registro: any) => {
          if (registro !== null && typeof registro === 'object' && !Array.isArray(registro)) {
            movimientosOriginales.push(registro);
          }
        });
      }
    });

    if (!movimientosOriginales.length) {
      this.toastrService.warning('No existen movimientos originales de producción para exportar.', 'Exportación');
      return;
    }

    try {
      const ramo = String(ing?.nombreRamo || 'RAMO').trim();
      const poliza = String(ing?.poliza || '').trim();

      // Mantener los nombres EXACTOS de las propiedades del JSON.
      // Añadir incluso las columnas presentes solo en algunas filas.
      const columnas: string[] = [];
      const columnasVistas = new Set<string>();
      movimientosOriginales.forEach((movimiento: any) => {
        Object.keys(movimiento).forEach((campo: string) => {
          if (!columnasVistas.has(campo)) {
            columnasVistas.add(campo);
            columnas.push(campo);
          }
        });
      });

      // Identificadores como texto para evitar pérdida de ceros a la izquierda
      // o alteraciones en los números largos al abrirlos en Excel.
      const identificadores = new Set([
        'rucced', 'cdcliente', 'cdramo', 'numfactura', 'numprefactura',
        'numoperacion', 'refcaremi', 'poliza', 'factref', 'numerodocumento'
      ]);

      const filas: any[][] = [columnas];
      movimientosOriginales.forEach((movimiento: any) => {
        filas.push(columnas.map((campo: string) => {
          const valor = movimiento[campo];
          if (valor === null || valor === undefined) return '';
          if (identificadores.has(campo.toLowerCase())) return String(valor);
          if (typeof valor === 'object') return JSON.stringify(valor);
          return valor; // Conservar valores y tipos originales del JSON.
        }));
      });

      const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(filas);
      const ultimaColumna = XLSX.utils.encode_col(columnas.length - 1);
      const ultimaFila = filas.length;
      ws['!autofilter'] = { ref: `A1:${ultimaColumna}${ultimaFila}` };
      ws['!rows'] = [{ hpt: 28 }];
      ws['!cols'] = columnas.map((campo: string, indice: number) => {
        let largo = campo.length;
        movimientosOriginales.slice(0, 100).forEach((registro: any) => {
          const texto = registro[campo] == null ? '' : String(registro[campo]);
          largo = Math.max(largo, texto.length);
        });
        return { wch: Math.max(12, Math.min(42, largo + 2)) };
      });

      const borde = {
        top: { style: 'thin', color: { rgb: 'D6E0EB' } },
        bottom: { style: 'thin', color: { rgb: 'D6E0EB' } },
        left: { style: 'thin', color: { rgb: 'D6E0EB' } },
        right: { style: 'thin', color: { rgb: 'D6E0EB' } }
      };

      filas.forEach((fila: any[], indiceFila: number) => {
        columnas.forEach((campo: string, indiceColumna: number) => {
          const celdaRef = XLSX.utils.encode_cell({ r: indiceFila, c: indiceColumna });
          if (!ws[celdaRef]) ws[celdaRef] = { t: 's', v: '' };
          const celda = ws[celdaRef];
          if (indiceFila > 0 && identificadores.has(campo.toLowerCase())) {
            celda.t = 's';
            celda.v = celda.v == null ? '' : String(celda.v);
            celda.z = '@';
          }
          celda.s = {
            font: {
              name: 'Calibri', sz: 10, bold: indiceFila === 0,
              color: { rgb: indiceFila === 0 ? 'FFFFFF' : '26384B' }
            },
            fill: {
              patternType: 'solid',
              fgColor: { rgb: indiceFila === 0 ? '1F5D9B' : indiceFila % 2 === 0 ? 'F3F7FB' : 'FFFFFF' }
            },
            alignment: {
              vertical: 'center',
              horizontal: indiceFila === 0 ? 'center' : 'left',
              wrapText: indiceFila === 0
            },
            border: borde
          };
        });
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Datos Producción');
      const nombreArchivo = `Datos_Brutos_Produccion_${ramo}${poliza ? '_' + poliza : ''}`
        .replace(/[\\/:*?"<>|\x00-\x1F]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 130);
      XLSX.writeFile(wb, `${nombreArchivo}.xlsx`, { compression: true, bookType: 'xlsx' });
    } catch (error) {
      console.error('Error al exportar los movimientos originales de producción:', error);
      this.toastrService.error('No fue posible exportar los datos originales del ramo.', 'Exportación');
    }
  }

  exportarDetalles(): void {
    const programas = this.programasVisualizados;
    if (!programas.length) {
      this.toastrService.warning('No existen detalles de PYG para exportar.', 'Exportación');
      return;
    }
    const wb = XLSX.utils.book_new();
    const wsDetalle: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([]);
    const wsResumen: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([]);
    const moneda = '$#,##0.00;[Red]-$#,##0.00';
    const porcentaje = '0.00"%"';
    const entero = '0';
    const colores = ['E6F0FA', 'EDF8EA', 'FFF4DF', 'F2ECFA', 'FCEBF0'];
    const coloresGrupo = [{ fondo: 'DCEBFA', texto: '15467B' }, { fondo: 'E0F2E8', texto: '176843' }, { fondo: 'FFF0D7', texto: '8B5405' }, { fondo: 'EEE6FA', texto: '603B87' }, { fondo: 'FCE3EC', texto: '9B3256' }];
    // Una paleta por ramo: la misma identificación cromática en el detalle
    // individual de producción y en el consolidado del grupo.
    const coloresProduccion = [
      { titulo: 'BFD9F3', encabezado: 'DBEAF9', fondo: 'EFF6FD', texto: '174A7D' },
      { titulo: 'C6E8D2', encabezado: 'E0F2E6', fondo: 'F0FAF3', texto: '176343' },
      { titulo: 'FFE0B3', encabezado: 'FFF0D7', fondo: 'FFF8EC', texto: '89530D' },
      { titulo: 'DDD0F4', encabezado: 'EEE6FB', fondo: 'F6F1FD', texto: '603B87' },
      { titulo: 'F9C8D8', encabezado: 'FCE4EC', fondo: 'FFF3F7', texto: '8F3456' },
      { titulo: 'BFE9E6', encabezado: 'DDF5F2', fondo: 'F0FBF9', texto: '176B69' },
      { titulo: 'F7E4A5', encabezado: 'FCF2D1', fondo: 'FFFAEB', texto: '765A07' },
      { titulo: 'CCDAE9', encabezado: 'E5EDF5', fondo: 'F3F7FA', texto: '34516C' },
      { titulo: 'D4E1B4', encabezado: 'E9F1D9', fondo: 'F6FAEE', texto: '536C24' },
      { titulo: 'F4CEBB', encabezado: 'FBE7DE', fondo: 'FEF5F0', texto: '8B4730' },
      { titulo: 'C6DAF8', encabezado: 'DFEAFD', fondo: 'F2F7FE', texto: '2D4C92' },
      { titulo: 'E7C6DF', encabezado: 'F5E4F1', fondo: 'FCF3FA', texto: '793F6E' }
    ];
    const escribir = (fila: number, valores: any[], estilos?: any[], inicio: number = 0, formatos?: { [columna: number]: string }) => {
      XLSX.utils.sheet_add_aoa(wsDetalle, [valores], { origin: { r: fila, c: inicio } });
      valores.forEach((valor: any, columna: number) => {
        const celda = wsDetalle[XLSX.utils.encode_cell({ r: fila, c: inicio + columna })];
        // Las celdas vacías también reciben el borde para cerrar las tablas.
        const celdaEstilo = celda || (estilos && estilos[columna]
          ? (wsDetalle[XLSX.utils.encode_cell({ r: fila, c: inicio + columna })] = { t: 's', v: '' })
          : null);
        if (!celdaEstilo) return;
        if (typeof valor === 'number' && !Number.isNaN(valor)) {
          celdaEstilo.z = formatos?.[columna] || moneda;
        }
        if (estilos && estilos[columna]) celdaEstilo.s = estilos[columna];
      });
    };
    const estilo = (fondo: string, negrita: boolean = false, color: string = '1F2937'): any => ({
      font: { bold: negrita, color: { rgb: color }, sz: 10 },
      fill: { patternType: 'solid', fgColor: { rgb: fondo } },
      alignment: { vertical: 'center', wrapText: true },
      // Bordes en los cuatro lados, no únicamente en la parte inferior.
      border: {
        top: { style: 'thin', color: { rgb: 'B7C7D9' } },
        bottom: { style: 'thin', color: { rgb: 'B7C7D9' } },
        left: { style: 'thin', color: { rgb: 'B7C7D9' } },
        right: { style: 'thin', color: { rgb: 'B7C7D9' } }
      }
    });
    const encabezado = (fondo: string, texto: string, longitud: number = 10) => Array.from({ length: longitud }, () => estilo(fondo, true, texto));
    let fila = 0;
    escribir(fila, [`DETALLE PYG - ${this.objCliente?.nombre || this.clienteSeleccionado?.nombres || 'CLIENTE'}`], [this.estiloTituloPrincipal()]);
    this.agregarMerge(wsDetalle, fila + 1, 0, fila + 1, 10);
    fila += 2;
    programas.forEach((programa: any, indicePrograma: number) => {
      const ramos = programa.ramos || [];
      const nombre = ramos.length > 1 ? (programa.nombre || ramos[0]?.nombrePrograma || 'GRUPO') : (ramos[0]?.nombreRamo || programa.nombre || 'RAMO');
      const paleta = coloresGrupo[indicePrograma % coloresGrupo.length];
      const nombreRegistro = ramos.length > 1 ? `GRUPO: ${nombre}` : `RAMO: ${nombre}`;
      escribir(fila, [`REGISTRO ${indicePrograma + 1}  |  ${nombreRegistro}`], [estilo(paleta.fondo, true, paleta.texto)]);
      this.agregarMerge(wsDetalle, fila + 1, 0, fila + 1, 10);
      fila++;
      escribir(fila, ['DATOS DE INGRESOS'], [estilo('E5EFF9', true, '174E81')]);
      this.agregarMerge(wsDetalle, fila + 1, 0, fila + 1, 10);
      fila++;
      escribir(fila, ['Ramo', 'Aseguradora', 'Póliza', 'Inicio vigencia', 'Fin vigencia', 'Prima neta mensual', 'Prima neta anual', '% Comisión', 'Comisión mensual', 'Comisión anual'], encabezado('D9EAF8', '15467B'));
      fila++;
      ramos.forEach((ramo: any) => {
        const prima = Number(ramo.primaMensual || 0);
        const porcentajeComision = Number(ramo.porcentajeComision || 0);
        const comision = Number(ramo.comision || prima * porcentajeComision / 100);
        escribir(
          fila,
          [ramo.nombreRamo || '', ramo.nombreAseguradora || '', ramo.poliza || 'Pendiente', ramo.inicioVigencia || '', ramo.finVigencia || '', prima, Number(ramo.primaAnual ?? prima * 12), porcentajeComision, comision, Number(ramo.comisionAnual ?? comision * 12)],
          Array.from({ length: 10 }, () => estilo('FFFFFF')),
          0,
          { 7: porcentaje }
        );
        fila++;
      });
      escribir(
        fila,
        ['TOTALES', '', '', '', '', this.sumarCampoPrograma(programa, 'primaMensual'), this.sumarCampoPrograma(programa, 'primaAnual'), '', this.sumarCampoPrograma(programa, 'comision'), this.sumarCampoPrograma(programa, 'comisionAnual')],
        Array.from({ length: 10 }, () => estilo('E8F5E9', true, '087541'))
      );
      this.agregarMerge(wsDetalle, fila + 1, 0, fila + 1, 4);
      fila += 2;
      escribir(fila, ['DATOS DE GASTOS Y FACTURAS'], [estilo('FDE9D8', true, '995012')]);
      this.agregarMerge(wsDetalle, fila + 1, 0, fila + 1, 10);
      fila++;
      escribir(fila, ['Descripción gasto', 'Cantidad', 'Tipo ingreso', 'Valor gasto', 'Fecha registro', 'Descripción factura', 'Fecha factura', 'Valor factura', 'Total facturas', 'Restante'], encabezado('FFF1DF', '8B5405'));
      fila++;
      const grupos = this.getGastosFacturasPrograma(programa);
      if (!grupos.length) {
        escribir(fila, ['Sin gastos registrados']);
        fila++;
      } else {
        grupos.forEach((grupo: any) => {
          const gasto = grupo.gasto;
          const esAlcance = String(gasto?.tipo || '').trim().toLowerCase() === 'alcance';
          const fondo = esAlcance ? 'FFE066' : colores[grupo.indice % colores.length];
          const restante = Number(gasto.valor || 0) - grupo.totalFacturas;
          const datos = [
            grupo.mostrarGasto ? gasto.descripcion : '',
            grupo.mostrarGasto ? Number(gasto.cantidad || 1) : '',
            grupo.mostrarGasto ? gasto.tipo : '',
            grupo.mostrarGasto ? Number(gasto.valor || 0) : '',
            grupo.mostrarGasto ? (gasto.fecha || '') : '',
            grupo.factura?.descripcion || 'Sin facturas',
            grupo.factura?.fechaFactura || '',
            grupo.factura ? Number(grupo.factura.valor || 0) : '',
            grupo.mostrarGasto ? grupo.totalFacturas : '',
            grupo.mostrarGasto ? restante : ''
          ];
          const estilos = Array.from({ length: 10 }, () => estilo(fondo, true, esAlcance ? '594000' : '1F2937'));
          if (grupo.mostrarGasto && restante < 0) estilos[9] = estilo(fondo, true, 'DC3545');
          if (grupo.mostrarGasto && restante >= 0) estilos[9] = estilo(fondo, true, '008B5A');
          escribir(fila, datos, estilos, 0, { 1: entero });
          if (grupo.mostrarGasto && grupo.cantidadFilas > 1) {
            for (const col of [0, 1, 2, 3, 4, 8, 9]) this.agregarMerge(wsDetalle, fila + 1, col, fila + grupo.cantidadFilas, col);
          }
          fila++;
        });
      }
      escribir(
        fila,
        ['TOTAL GASTOS', '', '', this.totalGastosPrograma(programa), '', 'TOTAL FACTURAS', '', this.totalFacturasPrograma(programa), '', this.totalGastosPrograma(programa) - this.totalFacturasPrograma(programa)],
        Array.from({ length: 10 }, () => estilo('FFF0D8', true, '84510B'))
      );
      fila++;
      escribir(
        fila,
        [
          '% INVERSIÓN',
          '',
          '',
          this.sumarCampoPrograma(programa, 'comisionAnual')
            ? Number((100 * this.totalGastosPrograma(programa) / this.sumarCampoPrograma(programa, 'comisionAnual')).toFixed(2))
            : 0
        ],
        Array.from({ length: 4 }, () => this.estiloNormal()),
        0,
        { 3: porcentaje }
      );
      fila++;
      escribir(
        fila,
        ['UTILIDAD', '', '', this.sumarCampoPrograma(programa, 'comisionAnual') - this.totalGastosPrograma(programa)],
        Array.from({ length: 4 }, () => this.estiloNormal())
      );
      fila += 2;

      // FACTURAS DE PRODUCCIÓN: se exportan desde los mismos datos que muestra
      // cada ramo en pantalla (ing.proyeccion), sin afectar gastos ni resumen PYG.
      ramos.forEach((ramo: any, indiceRamo: number) => {
        // Para registros individuales se conserva también un color diferente
        // por cada registro que se exporte.
        const indiceColor = ramos.length > 1 ? indiceRamo : indicePrograma;
        const colorRamo = coloresProduccion[indiceColor % coloresProduccion.length];
        const facturasProduccion: any[] = Array.isArray(ramo?.proyeccion)
          ? ramo.proyeccion
          : [];
        if (!facturasProduccion.length) return;

        escribir(
          fila,
          [`FACTURAS PRODUCCIÓN — ${ramo.nombreRamo || 'RAMO'}`],
          [estilo(colorRamo.titulo, true, colorRamo.texto)]
        );
        this.agregarMerge(wsDetalle, fila + 1, 0, fila + 1, 6);
        this.aplicarEstiloRangoMerge(wsDetalle, fila + 1, 0, fila + 1, 6, estilo(colorRamo.titulo, true, colorRamo.texto));
        fila++;

        escribir(
          fila,
          ['#', 'Facturas', 'Desde', 'Hasta', 'Prima Neta', 'Comisión Broker', 'Porcentaje'],
          encabezado(colorRamo.encabezado, colorRamo.texto, 7),
          0,
          { 0: entero }
        );
        fila++;

        facturasProduccion.forEach((proy: any, indice: number) => {
          const primaNeta = this.convertirANumero(proy?.priNet);
          const comisionBroker = this.convertirANumero(proy?.valcombroker);
          const listaFacturas = Array.isArray(proy?.facturas)
            ? proy.facturas.filter((factura: any) => factura != null && String(factura).trim() !== '')
            : [];

          escribir(
            fila,
            [
              indice + 1,
              listaFacturas.length ? listaFacturas.join('\n') : '-',
              this.formatearFechaExcel(proy?.fcdesde),
              this.formatearFechaExcel(proy?.fchasta),
              primaNeta,
              comisionBroker,
              primaNeta ? comisionBroker / primaNeta : 0
            ],
            Array.from({ length: 7 }, () => estilo(colorRamo.fondo)),
            0,
            { 0: entero, 4: moneda, 5: moneda, 6: '0.00%' }
          );

          // Mostrar completos los números de factura cuando hay varias.
          if (listaFacturas.length > 1) {
            if (!wsDetalle['!rows']) wsDetalle['!rows'] = [];
            wsDetalle['!rows'][fila] = { hpt: Math.min(120, listaFacturas.length * 15) };
          }
          fila++;
        });

        const primaFacturada = this.convertirANumero(ramo?.totalPrima);
        const comisionFacturada = this.convertirANumero(ramo?.totalComision);
        const primaProyectada = this.convertirANumero(ramo?.proyeccionPrima);
        const comisionProyectada = this.convertirANumero(ramo?.proyeccionComision);
        const totalPrimaProduccion = primaFacturada + primaProyectada;
        const totalComisionProduccion = comisionFacturada + comisionProyectada;

        const resumenProduccion = [
          {
            titulo: `Facturado\n${ramo?.mesesFacturados ?? facturasProduccion.length} meses`,
            prima: primaFacturada, comision: comisionFacturada, fondo: colorRamo.fondo, color: colorRamo.texto
          },
          {
            titulo: `Proyección\n${ramo?.mesesRestantes ?? 0} meses`,
            prima: primaProyectada, comision: comisionProyectada, fondo: colorRamo.encabezado, color: colorRamo.texto
          },
          {
            titulo: 'Total',
            prima: totalPrimaProduccion, comision: totalComisionProduccion, fondo: colorRamo.titulo, color: colorRamo.texto
          }
        ];

        resumenProduccion.forEach((resumen: any) => {
          escribir(
            fila,
            [
              '', '', '', resumen.titulo, resumen.prima, resumen.comision,
              resumen.prima ? resumen.comision / resumen.prima : 0
            ],
            Array.from({ length: 7 }, () => estilo(resumen.fondo, true, resumen.color)),
            0,
            { 4: moneda, 5: moneda, 6: '0.00%' }
          );
          this.agregarMerge(wsDetalle, fila + 1, 0, fila + 1, 2);
          fila++;
        });

        fila += 2;
      });

      // CONSOLIDADO SOLO DE GRUPOS: un ramo por fila, con el mismo color
      // que sus facturas individuales. Las cifras son las mismas que figuran
      // como "Total" en cada tabla (facturado + proyección).
      // No se duplican aquí las filas de meses facturados o proyectados.
      if (ramos.length > 1 && ramos.some((ramo: any) =>
        Array.isArray(ramo?.proyeccion) && ramo.proyeccion.length > 0)) {

        escribir(
          fila,
          [`TOTAL FACTURAS PRODUCCIÓN DEL GRUPO — ${nombre}`],
          [estilo('DCE8F5', true, '174A78')]
        );
        this.agregarMerge(wsDetalle, fila + 1, 0, fila + 1, 6);
        this.aplicarEstiloRangoMerge(wsDetalle, fila + 1, 0, fila + 1, 6, estilo('DCE8F5', true, '174A78'));
        fila++;

        escribir(
          fila,
          ['Ramo', '', '', '', 'Prima Neta Total', 'Comisión Broker Total', 'Porcentaje'],
          encabezado('E4EDF7', '174A78', 7)
        );
        this.agregarMerge(wsDetalle, fila + 1, 0, fila + 1, 3);
        this.aplicarEstiloRangoMerge(wsDetalle, fila + 1, 0, fila + 1, 3, estilo('E4EDF7', true, '174A78'));
        fila++;

        let sumaPrimaGrupo = 0;
        let sumaComisionGrupo = 0;

        ramos.forEach((ramo: any, indiceRamo: number) => {
          const colorRamo = coloresProduccion[indiceRamo % coloresProduccion.length];
          const primaRamo = this.convertirANumero(ramo?.totalPrima)
            + this.convertirANumero(ramo?.proyeccionPrima);
          const comisionRamo = this.convertirANumero(ramo?.totalComision)
            + this.convertirANumero(ramo?.proyeccionComision);

          sumaPrimaGrupo += primaRamo;
          sumaComisionGrupo += comisionRamo;

          escribir(
            fila,
            [ramo?.nombreRamo || 'RAMO', '', '', '', primaRamo, comisionRamo,
              primaRamo ? comisionRamo / primaRamo : 0],
            Array.from({ length: 7 }, () => estilo(colorRamo.fondo, true, colorRamo.texto)),
            0,
            { 4: moneda, 5: moneda, 6: '0.00%' }
          );
          this.agregarMerge(wsDetalle, fila + 1, 0, fila + 1, 3);
          this.aplicarEstiloRangoMerge(wsDetalle, fila + 1, 0, fila + 1, 3,
            estilo(colorRamo.fondo, true, colorRamo.texto));
          fila++;
        });

        escribir(
          fila,
          ['TOTAL GENERAL DEL GRUPO', '', '', '', sumaPrimaGrupo, sumaComisionGrupo,
            sumaPrimaGrupo ? sumaComisionGrupo / sumaPrimaGrupo : 0],
          Array.from({ length: 7 }, () => estilo('D4E6F6', true, '123E67')),
          0,
          { 4: moneda, 5: moneda, 6: '0.00%' }
        );
        this.agregarMerge(wsDetalle, fila + 1, 0, fila + 1, 3);
        this.aplicarEstiloRangoMerge(wsDetalle, fila + 1, 0, fila + 1, 3,
          estilo('D4E6F6', true, '123E67'));
        fila += 2;
      }
      fila += 1;
    });
    wsDetalle['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 19 }, { wch: 34 }, { wch: 18 }, { wch: 19 }, { wch: 20 }, { wch: 20 }, { wch: 4 }];
    XLSX.utils.sheet_add_aoa(wsResumen, [['RESUMEN PYG']], { origin: 'A1' });
    this.agregarMerge(wsResumen, 1, 0, 1, 1);
    this.aplicarEstiloRangoMerge(wsResumen, 1, 0, 1, 1, this.estiloTituloPrincipal());
    this.agregarResumenPYGExcel(wsResumen, 3, 0);
    XLSX.utils.sheet_add_aoa(wsResumen, [['RESUMEN GASTOS']], { origin: 'D1' });
    this.agregarMerge(wsResumen, 1, 3, 1, 4);
    this.aplicarEstiloRangoMerge(wsResumen, 1, 3, 1, 4, this.estiloTituloPrincipal());
    this.agregarResumenGastosExcel(wsResumen, 3, 3);
    wsResumen['!cols'] = [{ wch: 38 }, { wch: 18 }, { wch: 5 }, { wch: 38 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle PYG');
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
    const nombreCliente = String(this.objCliente?.nombre || 'Cliente').replace(/[\\/?*[\]:"]/g, '').trim();
    XLSX.writeFile(wb, `PYG ${nombreCliente}.xlsx`, { compression: true, bookType: 'xlsx' });
  }

  /** Agrupa manteniendo el orden original de aparición de cada ramo. */
  private agruparIngresosPorRamo(lista: any[]): any[][] {
    const grupos = new Map<string, any[]>();

    lista.forEach((item: any) => {
      const claveRamo = String(
        item?.ramo ?? item?.idRamo ?? item?.nombreRamo ?? 'SIN_RAMO'
      );

      if (!grupos.has(claveRamo)) {
        grupos.set(claveRamo, []);
      }

      grupos.get(claveRamo)!.push(item);
    });

    return Array.from(grupos.values());
  }

  /**
   * Copia una hoja temporal a otra hoja conservando valores, estilos,
   * formatos y celdas combinadas, aplicando un desplazamiento.
   */
  private copiarBloqueHoja(
    origen: XLSX.WorkSheet,
    destino: XLSX.WorkSheet,
    filaInicioDestino: number,
    colInicioDestino: number
  ): void {
    const desplazamientoFila = filaInicioDestino - 1;

    Object.keys(origen).forEach((clave: string) => {
      if (clave.startsWith('!')) return;

      const posicionOrigen = XLSX.utils.decode_cell(clave);
      const posicionDestino = {
        r: posicionOrigen.r + desplazamientoFila,
        c: posicionOrigen.c + colInicioDestino
      };
      const referenciaDestino = XLSX.utils.encode_cell(posicionDestino);

      destino[referenciaDestino] = {
        ...origen[clave],
        s: origen[clave]?.s
          ? JSON.parse(JSON.stringify(origen[clave].s))
          : origen[clave]?.s
      };
    });

    const mergesOrigen = origen['!merges'] ?? [];
    if (mergesOrigen.length) {
      destino['!merges'] = destino['!merges'] ?? [];

      mergesOrigen.forEach((merge: XLSX.Range) => {
        destino['!merges']!.push({
          s: {
            r: merge.s.r + desplazamientoFila,
            c: merge.s.c + colInicioDestino
          },
          e: {
            r: merge.e.r + desplazamientoFila,
            c: merge.e.c + colInicioDestino
          }
        });
      });
    }

    const rangoDestino = XLSX.utils.decode_range(destino['!ref'] || 'A1:A1');
    const rangoOrigen = origen['!ref']
      ? XLSX.utils.decode_range(origen['!ref'])
      : null;

    if (rangoOrigen) {
      rangoDestino.e.r = Math.max(
        rangoDestino.e.r,
        rangoOrigen.e.r + desplazamientoFila
      );
      rangoDestino.e.c = Math.max(
        rangoDestino.e.c,
        rangoOrigen.e.c + colInicioDestino
      );
      destino['!ref'] = XLSX.utils.encode_range(rangoDestino);
    }
  }

  /**
   * Agrega al Excel un ramo con la misma información funcional que se muestra
   * en la tarjeta HTML del detalle PYG.
   */
  private agregarRamoPantallaExcel(
    ws: XLSX.WorkSheet,
    ing: any,
    filaInicio: number,
    numeroRamo: number
  ): number {
    let fila = filaInicio;

    // Columnas desde A hasta I.
    const colFin = 8;

    const estiloDato = {
      ...this.estiloNormal(),
      alignment: {
        vertical: 'center',
        wrapText: true
      }
    };

    const estiloEtiqueta = {
      ...estiloDato,
      font: {
        bold: true,
        color: { rgb: '44546A' }
      },
      fill: {
        patternType: 'solid',
        fgColor: { rgb: 'F7FAFC' }
      }
    };

    const estiloCabeceraGasto = {
      ...this.estiloHeaderAzul(),
      fill: {
        patternType: 'solid',
        fgColor: { rgb: 'EAF3FF' }
      }
    };

    const estiloCabeceraFactura = {
      ...this.estiloHeaderAzul(),
      font: {
        bold: true,
        color: { rgb: '003A8C' }
      },
      fill: {
        patternType: 'solid',
        fgColor: { rgb: 'EDF4FB' }
      }
    };

    // =========================
    // ENCABEZADO DEL RAMO
    // =========================
    XLSX.utils.sheet_add_aoa(
      ws,
      [[
        `${numeroRamo}. ${String(
          ing?.nombreRamo || 'RAMO'
        ).toUpperCase()}`
      ]],
      {
        origin: {
          r: fila - 1,
          c: 0
        }
      }
    );

    this.agregarMerge(
      ws,
      fila,
      0,
      fila,
      colFin
    );

    this.aplicarEstiloRangoMerge(
      ws,
      fila,
      0,
      fila,
      colFin,
      this.estiloTituloRamo()
    );

    fila++;

    XLSX.utils.sheet_add_aoa(
      ws,
      [[
        `Número de Póliza: ${ing?.poliza ?? ''}`,
        '',
        '',
        `Porcentaje: ${this.convertirANumero(
          ing?.porcentajeComision
        ).toFixed(2)}%`,
        '',
        `Aseguradora: ${ing?.nombreAseguradora ?? ''}`,
        '',
        '',
        ''
      ]],
      {
        origin: {
          r: fila - 1,
          c: 0
        }
      }
    );

    this.agregarMerge(
      ws,
      fila,
      0,
      fila,
      2
    );

    this.agregarMerge(
      ws,
      fila,
      3,
      fila,
      4
    );

    this.agregarMerge(
      ws,
      fila,
      5,
      fila,
      8
    );

    this.aplicarEstiloRangoMerge(
      ws,
      fila,
      0,
      fila,
      2,
      this.estiloSubtitulo()
    );

    this.aplicarEstiloRangoMerge(
      ws,
      fila,
      3,
      fila,
      4,
      this.estiloSubtitulo()
    );

    this.aplicarEstiloRangoMerge(
      ws,
      fila,
      5,
      fila,
      8,
      this.estiloSubtitulo()
    );

    fila += 2;

    // =========================
    // INFORMACIÓN Y REVISIÓN
    // =========================
    const totalPrimaAnual =
      this.convertirANumero(ing?.totalPrima) +
      this.convertirANumero(ing?.proyeccionPrima);

    const totalComisionAnual =
      this.convertirANumero(ing?.totalComision) +
      this.convertirANumero(ing?.proyeccionComision);

    const porcentajeRevision =
      totalPrimaAnual > 0
        ? totalComisionAnual / totalPrimaAnual
        : 0;

    const filaInfo = fila;

    XLSX.utils.sheet_add_aoa(
      ws,
      [
        [
          '',
          '',
          '',
          '',
          `Revisión en ${String(
            ing?.mesRevision || ''
          ).toUpperCase()}`,
          '',
          '',
          ''
        ],
        [
          'Inicio Vigencia',
          this.formatearFechaExcel(ing?.inicioVigencia),
          'Fin Vigencia',
          this.formatearFechaExcel(ing?.finVigencia),
          '',
          'Anual',
          'Mensual',
          ''
        ],
        [
          'Prima Mensual',
          this.convertirANumero(ing?.primaMensual),
          'Prima Anual',
          this.convertirANumero(ing?.primaAnual),
          'Prima',
          totalPrimaAnual,
          totalPrimaAnual / 12,
          ''
        ],
        [
          'Comisión Mensual',
          this.convertirANumero(ing?.comision),
          'Comisión Anual',
          this.convertirANumero(ing?.comisionAnual),
          'Comisión',
          totalComisionAnual,
          totalComisionAnual / 12,
          ''
        ],
        [
          '',
          '',
          '',
          '',
          '%',
          porcentajeRevision,
          porcentajeRevision,
          ''
        ]
      ],
      {
        origin: {
          r: filaInfo - 1,
          c: 0
        }
      }
    );

    this.agregarMerge(
      ws,
      filaInfo,
      4,
      filaInfo,
      6
    );

    this.aplicarEstiloRangoMerge(
      ws,
      filaInfo,
      4,
      filaInfo,
      6,
      estiloCabeceraFactura
    );

    // Bloque de información general A:D.
    for (
      let filaActual = filaInfo + 1;
      filaActual <= filaInfo + 3;
      filaActual++
    ) {
      this.aplicarEstiloRango(
        ws,
        filaActual,
        0,
        filaActual,
        3,
        estiloDato
      );

      const etiquetaA = XLSX.utils.encode_cell({
        r: filaActual - 1,
        c: 0
      });

      const etiquetaC = XLSX.utils.encode_cell({
        r: filaActual - 1,
        c: 2
      });

      if (ws[etiquetaA]) {
        ws[etiquetaA].s = estiloEtiqueta;
      }

      if (ws[etiquetaC]) {
        ws[etiquetaC].s = estiloEtiqueta;
      }
    }

    // Tabla de revisión E:G.
    this.aplicarEstiloRango(
      ws,
      filaInfo + 1,
      4,
      filaInfo + 4,
      6,
      estiloDato
    );

    for (
      let filaActual = filaInfo + 1;
      filaActual <= filaInfo + 4;
      filaActual++
    ) {
      const refEtiqueta = XLSX.utils.encode_cell({
        r: filaActual - 1,
        c: 4
      });

      if (ws[refEtiqueta]) {
        ws[refEtiqueta].s = estiloEtiqueta;
      }
    }

    const refAnual = XLSX.utils.encode_cell({
      r: filaInfo,
      c: 5
    });

    const refMensual = XLSX.utils.encode_cell({
      r: filaInfo,
      c: 6
    });

    if (ws[refAnual]) {
      ws[refAnual].s = estiloCabeceraFactura;
    }

    if (ws[refMensual]) {
      ws[refMensual].s = estiloCabeceraFactura;
    }

    // Valores monetarios de información general.
    this.aplicarFormatoMoneda(
      ws,
      filaInfo + 2,
      1,
      this.estiloMonedaVerde()
    );

    this.aplicarFormatoMoneda(
      ws,
      filaInfo + 2,
      3,
      this.estiloMonedaVerde()
    );

    this.aplicarFormatoMoneda(
      ws,
      filaInfo + 3,
      1,
      this.estiloMonedaAzul()
    );

    this.aplicarFormatoMoneda(
      ws,
      filaInfo + 3,
      3,
      this.estiloMonedaAzul()
    );

    // Valores monetarios y porcentajes de revisión.
    this.aplicarFormatoMoneda(
      ws,
      filaInfo + 2,
      5,
      estiloDato
    );

    this.aplicarFormatoMoneda(
      ws,
      filaInfo + 2,
      6,
      estiloDato
    );

    this.aplicarFormatoMoneda(
      ws,
      filaInfo + 3,
      5,
      estiloDato
    );

    this.aplicarFormatoMoneda(
      ws,
      filaInfo + 3,
      6,
      estiloDato
    );

    this.aplicarFormatoPorcentaje(
      ws,
      filaInfo + 4,
      5,
      this.estiloPorcentaje()
    );

    this.aplicarFormatoPorcentaje(
      ws,
      filaInfo + 4,
      6,
      this.estiloPorcentaje()
    );

    fila = filaInfo + 6;

    // =========================
    // GASTOS Y FACTURAS
    // =========================
    XLSX.utils.sheet_add_aoa(
      ws,
      [['GASTOS Y FACTURAS']],
      {
        origin: {
          r: fila - 1,
          c: 0
        }
      }
    );

    this.agregarMerge(
      ws,
      fila,
      0,
      fila,
      colFin
    );

    this.aplicarEstiloRangoMerge(
      ws,
      fila,
      0,
      fila,
      colFin,
      estiloCabeceraGasto
    );

    fila++;

    XLSX.utils.sheet_add_aoa(
      ws,
      [[
        'Descripción gasto',
        'Cantidad',
        'Tipo ingreso',
        'Valor gasto',
        'Descripción factura',
        'Fecha',
        'Valor factura',
        'Total facturas',
        'Restante'
      ]],
      {
        origin: {
          r: fila - 1,
          c: 0
        }
      }
    );

    this.aplicarEstiloRango(
      ws,
      fila,
      0,
      fila,
      colFin,
      estiloCabeceraFactura
    );

    fila++;

    const grupos = this.getGastosConFacturas(ing);

    if (!grupos.length) {
      XLSX.utils.sheet_add_aoa(
        ws,
        [[
          'Sin gastos registrados',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]],
        {
          origin: {
            r: fila - 1,
            c: 0
          }
        }
      );

      this.agregarMerge(
        ws,
        fila,
        0,
        fila,
        colFin
      );

      this.aplicarEstiloRangoMerge(
        ws,
        fila,
        0,
        fila,
        colFin,
        estiloDato
      );

      fila++;
    } else {
      grupos.forEach((grupo: any) => {
        const facturasGrupo =
          grupo?.facturas?.length
            ? grupo.facturas
            : [null];

        const filaGrupoInicio = fila;

        facturasGrupo.forEach(
          (factura: any, indiceFactura: number) => {
            const primeraFila = indiceFactura === 0;

            const tipoIngreso = primeraFila
              ? `${grupo?.gasto?.tipo ?? ''}${grupo?.gasto?.tipo === 'Alcance' &&
                grupo?.gasto?.fecha
                ? ` ${String(
                  grupo.gasto.fecha
                ).split(' ')[0]}`
                : ''
              }`
              : '';

            XLSX.utils.sheet_add_aoa(
              ws,
              [[
                primeraFila
                  ? grupo?.gasto?.descripcion ?? ''
                  : '',
                primeraFila
                  ? this.convertirANumero(
                    grupo?.gasto?.cantidad
                  )
                  : '',
                tipoIngreso,
                primeraFila
                  ? this.convertirANumero(
                    grupo?.gasto?.valor
                  )
                  : '',
                factura?.descripcion ?? 'Sin facturas',
                factura
                  ? this.formatearFechaExcel(
                    factura?.fechaFactura
                  )
                  : '',
                factura
                  ? this.convertirANumero(
                    factura?.valor
                  )
                  : '',
                primeraFila
                  ? this.getTotalFacturasGasto(grupo)
                  : '',
                primeraFila
                  ? this.getSaldoGasto(grupo)
                  : ''
              ]],
              {
                origin: {
                  r: fila - 1,
                  c: 0
                }
              }
            );

            this.aplicarEstiloRango(
              ws,
              fila,
              0,
              fila,
              colFin,
              estiloDato
            );

            if (primeraFila) {
              this.aplicarFormatoMoneda(
                ws,
                fila,
                3,
                estiloDato
              );

              this.aplicarFormatoMoneda(
                ws,
                fila,
                7,
                estiloDato
              );

              this.aplicarFormatoMoneda(
                ws,
                fila,
                8,
                this.estiloTotalFinal()
              );
            }

            if (factura) {
              this.aplicarFormatoMoneda(
                ws,
                fila,
                6,
                estiloDato
              );
            }

            fila++;
          }
        );

        const filaGrupoFin = fila - 1;

        if (filaGrupoFin > filaGrupoInicio) {
          [
            0, // Descripción gasto
            1, // Cantidad
            2, // Tipo ingreso
            3, // Valor gasto
            7, // Total facturas
            8  // Restante
          ].forEach((columna: number) => {
            this.agregarMerge(
              ws,
              filaGrupoInicio,
              columna,
              filaGrupoFin,
              columna
            );
          });
        }
      });
    }

    const totalGastos = this.convertirANumero(
      this.getTotalGastos(ing?.gastos ?? [])
    );

    const totalFacturas = this.convertirANumero(
      this.getTotalFacturasAsignadas(ing)
    );

    const saldoTotal = this.getSaldoTotal(ing);

    const porcentajeInversion =
      this.convertirANumero(ing?.comisionAnual) > 0
        ? totalGastos /
        this.convertirANumero(ing?.comisionAnual)
        : 0;

    const disponible =
      this.convertirANumero(ing?.comisionAnual) -
      totalGastos;

    XLSX.utils.sheet_add_aoa(
      ws,
      [
        [
          'TOTAL GASTOS',
          '',
          '',
          totalGastos,
          'TOTAL FACTURAS',
          '',
          '',
          totalFacturas,
          saldoTotal
        ],
        [
          '% Inversión',
          '',
          '',
          porcentajeInversion,
          '',
          '',
          '',
          '',
          ''
        ],
        [
          'Disponible',
          '',
          '',
          disponible,
          '',
          '',
          '',
          '',
          ''
        ]
      ],
      {
        origin: {
          r: fila - 1,
          c: 0
        }
      }
    );

    this.agregarMerge(
      ws,
      fila,
      0,
      fila,
      2
    );

    this.agregarMerge(
      ws,
      fila,
      4,
      fila,
      6
    );

    this.agregarMerge(
      ws,
      fila + 1,
      0,
      fila + 1,
      2
    );

    this.agregarMerge(
      ws,
      fila + 2,
      0,
      fila + 2,
      2
    );

    this.aplicarEstiloRangoMerge(
      ws,
      fila,
      0,
      fila,
      3,
      this.estiloMonedaRoja()
    );

    this.aplicarEstiloRangoMerge(
      ws,
      fila,
      4,
      fila,
      7,
      this.estiloMonedaAzul()
    );

    this.aplicarEstiloRangoMerge(
      ws,
      fila,
      8,
      fila,
      8,
      this.estiloTotalFinal()
    );

    this.aplicarEstiloRangoMerge(
      ws,
      fila + 1,
      0,
      fila + 1,
      3,
      this.estiloPorcentaje()
    );

    this.aplicarEstiloRangoMerge(
      ws,
      fila + 2,
      0,
      fila + 2,
      3,
      this.estiloTotalFinal()
    );

    this.aplicarFormatoMoneda(
      ws,
      fila,
      3,
      this.estiloMonedaRoja()
    );

    this.aplicarFormatoMoneda(
      ws,
      fila,
      7,
      this.estiloMonedaAzul()
    );

    this.aplicarFormatoMoneda(
      ws,
      fila,
      8,
      this.estiloTotalFinal()
    );

    this.aplicarFormatoPorcentaje(
      ws,
      fila + 1,
      3,
      this.estiloPorcentaje()
    );

    this.aplicarFormatoMoneda(
      ws,
      fila + 2,
      3,
      this.estiloTotalFinal()
    );

    fila += 4;

    // =========================
    // FACTURAS DE PRODUCCIÓN
    // =========================
    const proyeccion = ing?.proyeccion ?? [];

    if (proyeccion.length) {
      XLSX.utils.sheet_add_aoa(
        ws,
        [['FACTURAS PRODUCCIÓN']],
        {
          origin: {
            r: fila - 1,
            c: 0
          }
        }
      );

      this.agregarMerge(
        ws,
        fila,
        0,
        fila,
        colFin
      );

      this.aplicarEstiloRangoMerge(
        ws,
        fila,
        0,
        fila,
        colFin,
        estiloCabeceraGasto
      );

      fila++;

      XLSX.utils.sheet_add_aoa(
        ws,
        [[
          '#',
          'Facturas',
          'Desde',
          'Hasta',
          'Prima Neta',
          'Comisión Broker',
          'Porcentaje',
          '',
          ''
        ]],
        {
          origin: {
            r: fila - 1,
            c: 0
          }
        }
      );

      this.aplicarEstiloRango(
        ws,
        fila,
        0,
        fila,
        colFin,
        estiloCabeceraFactura
      );

      fila++;

      proyeccion.forEach(
        (proy: any, indice: number) => {
          const primaNeta = this.convertirANumero(
            proy?.priNet
          );

          const comisionBroker = this.convertirANumero(
            proy?.valcombroker
          );

          const porcentaje =
            primaNeta > 0
              ? comisionBroker / primaNeta
              : 0;

          const facturas = Array.isArray(proy?.facturas)
            ? proy.facturas.join('\n')
            : '';

          XLSX.utils.sheet_add_aoa(
            ws,
            [[
              indice + 1,
              facturas || '-',
              this.formatearFechaExcel(proy?.fcdesde),
              this.formatearFechaExcel(proy?.fchasta),
              primaNeta,
              comisionBroker,
              porcentaje,
              '',
              ''
            ]],
            {
              origin: {
                r: fila - 1,
                c: 0
              }
            }
          );

          this.aplicarEstiloRango(
            ws,
            fila,
            0,
            fila,
            colFin,
            estiloDato
          );

          this.aplicarFormatoMoneda(
            ws,
            fila,
            4,
            estiloDato
          );

          this.aplicarFormatoMoneda(
            ws,
            fila,
            5,
            estiloDato
          );

          this.aplicarFormatoPorcentaje(
            ws,
            fila,
            6,
            this.estiloPorcentaje()
          );

          const facturaRef = XLSX.utils.encode_cell({
            r: fila - 1,
            c: 1
          });

          if (ws[facturaRef]) {
            ws[facturaRef].s = {
              ...(ws[facturaRef].s || {}),
              alignment: {
                vertical: 'center',
                horizontal: 'left',
                wrapText: true
              }
            };
          }

          fila++;
        }
      );

      const totalPrima = this.convertirANumero(
        ing?.totalPrima
      );

      const totalComision = this.convertirANumero(
        ing?.totalComision
      );

      const proyeccionPrima = this.convertirANumero(
        ing?.proyeccionPrima
      );

      const proyeccionComision = this.convertirANumero(
        ing?.proyeccionComision
      );

      const totalPrimaGeneral =
        totalPrima + proyeccionPrima;

      const totalComisionGeneral =
        totalComision + proyeccionComision;

      XLSX.utils.sheet_add_aoa(
        ws,
        [
          [
            '',
            '',
            '',
            `Facturado\n${this.convertirANumero(
              ing?.mesesFacturados
            )} meses`,
            totalPrima,
            totalComision,
            totalPrima > 0
              ? totalComision / totalPrima
              : 0,
            '',
            ''
          ],
          [
            '',
            '',
            '',
            `Proyección\n${this.convertirANumero(
              ing?.mesesRestantes
            )} meses`,
            proyeccionPrima,
            proyeccionComision,
            proyeccionPrima > 0
              ? proyeccionComision / proyeccionPrima
              : 0,
            '',
            ''
          ],
          [
            '',
            '',
            '',
            'Total',
            totalPrimaGeneral,
            totalComisionGeneral,
            totalPrimaGeneral > 0
              ? totalComisionGeneral /
              totalPrimaGeneral
              : 0,
            '',
            ''
          ]
        ],
        {
          origin: {
            r: fila - 1,
            c: 0
          }
        }
      );

      for (
        let filaActual = fila;
        filaActual <= fila + 2;
        filaActual++
      ) {
        this.agregarMerge(
          ws,
          filaActual,
          0,
          filaActual,
          2
        );

        this.aplicarEstiloRango(
          ws,
          filaActual,
          0,
          filaActual,
          colFin,
          this.estiloTotalFinal()
        );

        this.aplicarFormatoMoneda(
          ws,
          filaActual,
          4,
          this.estiloTotalFinal()
        );

        this.aplicarFormatoMoneda(
          ws,
          filaActual,
          5,
          this.estiloTotalFinal()
        );

        this.aplicarFormatoPorcentaje(
          ws,
          filaActual,
          6,
          this.estiloPorcentaje()
        );
      }

      fila += 4;
    }

    // =========================
    // RESPONSABLE COMERCIAL
    // =========================
    XLSX.utils.sheet_add_aoa(
      ws,
      [[`Comercial: ${ing?.nombresUsuario ?? ''}`]],
      {
        origin: {
          r: fila - 1,
          c: 5
        }
      }
    );

    this.agregarMerge(
      ws,
      fila,
      5,
      fila,
      8
    );

    this.aplicarEstiloRangoMerge(
      ws,
      fila,
      5,
      fila,
      8,
      this.estiloSubtitulo()
    );

    return fila + 1;
  }

  /**
   * Devuelve una fecha en formato yyyy-MM-dd sin aplicar conversiones UTC.
   */
  private formatearFechaExcel(valor: unknown): string {
    if (!valor) return '';

    if (valor instanceof Date) {
      const anio = valor.getFullYear();
      const mes = String(valor.getMonth() + 1).padStart(2, '0');
      const dia = String(valor.getDate()).padStart(2, '0');
      return `${anio}-${mes}-${dia}`;
    }

    const texto = String(valor);
    const coincidencia = texto.match(/^(\d{4}-\d{2}-\d{2})/);
    return coincidencia ? coincidencia[1] : texto;
  }
  aplicarEstiloRango(
    ws: XLSX.WorkSheet,
    filaInicio: number,
    colInicio: number,
    filaFin: number,
    colFin: number,
    style: any
  ): void {
    for (let r = filaInicio - 1; r <= filaFin - 1; r++) {
      for (let c = colInicio; c <= colFin; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });

        // No crea celdas vacías.
        // Solo aplica estilo si la celda ya existe.
        if (!ws[cellRef]) continue;

        ws[cellRef].s = {
          ...(ws[cellRef].s || {}),
          ...style,
          border: this.bordeCompleto()
        };
      }
    }
  }
  agregarResumenPYGExcel(
    ws: XLSX.WorkSheet,
    filaInicio: number,
    colInicio: number
  ): void {
    let fila = filaInicio;

    const data: any[][] = [];

    this.ramosGuardados.forEach((ing: any) => {
      data.push([
        `Ingreso Anual ${ing.nombreRamo || ''} - ${(ing.inicioVigencia || '').toString().substring(0, 4)}`,
        Number(ing.comisionAnual || 0)
      ]);
    });

    data.push(
      ['', ''],
      ['Total Ingresos', Number(this.totalIngresosGeneral || 0)],
      ['Total Gastos', Number(this.totalGastosGeneral || 0)],
      ['% Inversión', (this.totalIngresosGeneral ? this.totalGastosGeneral / this.totalIngresosGeneral : 0)],
      ['Total Final', Number(this.totalIngresosGeneral - this.totalGastosGeneral)]
    );

    XLSX.utils.sheet_add_aoa(ws, data, {
      origin: {
        r: fila - 1,
        c: colInicio
      }
    });

    data.forEach((row, index) => {
      const filaExcel = fila + index;

      if (!row[0]) return;

      this.aplicarEstiloRango(ws, filaExcel, colInicio, filaExcel, colInicio + 1, this.estiloNormal());

      if (row[0] === 'Total Gastos') {
        this.aplicarFormatoMoneda(ws, filaExcel, colInicio + 1, this.estiloMonedaRoja());
      } else if (row[0] === '% Inversión') {
        this.aplicarFormatoPorcentaje(ws, filaExcel, colInicio + 1, this.estiloPorcentaje());
      } else if (row[0] === 'Total Final') {
        this.aplicarFormatoMoneda(ws, filaExcel, colInicio + 1, this.estiloTotalFinal());
      } else {
        this.aplicarFormatoMoneda(ws, filaExcel, colInicio + 1, this.estiloMonedaVerde());
      }

      const labelRef = XLSX.utils.encode_cell({
        r: filaExcel - 1,
        c: colInicio
      });

      if (ws[labelRef]) {
        ws[labelRef].s = {
          ...(ws[labelRef].s || {}),
          font: { bold: true },
          border: this.bordeCompleto()
        };
      }
    });
  }
  agregarResumenGastosExcel(
    ws: XLSX.WorkSheet,
    filaInicio: number,
    colInicio: number
  ): void {
    const porcentaje =
      this.totalGastosGeneral > 0
        ? Number(this.totalGastosFacturas || 0) / Number(this.totalGastosGeneral || 1)
        : 0;

    const data: any[][] = [
      ['Total Ingresos', Number(this.totalIngresosGeneral || 0)],
      ['Total Gastos Proyectados', Number(this.totalGastosGeneral || 0)],
      ['Total Gastos Reales', Number(this.totalGastosFacturas || 0)],
      ['Restante', Number(this.totalGastosGeneral || 0) - Number(this.totalGastosFacturas || 0)],
      ['% Inversión', porcentaje]
    ];

    XLSX.utils.sheet_add_aoa(ws, data, {
      origin: {
        r: filaInicio - 1,
        c: colInicio
      }
    });

    data.forEach((row, index) => {
      const filaExcel = filaInicio + index;

      this.aplicarEstiloRango(ws, filaExcel, colInicio, filaExcel, colInicio + 1, this.estiloNormal());

      if (row[0] === 'Total Gastos Proyectados' || row[0] === 'Total Gastos Reales') {
        this.aplicarFormatoMoneda(ws, filaExcel, colInicio + 1, this.estiloMonedaRoja());
      } else if (row[0] === 'Restante') {
        this.aplicarFormatoMoneda(ws, filaExcel, colInicio + 1, this.estiloMonedaAzul());
      } else if (row[0] === '% Inversión') {
        this.aplicarFormatoPorcentaje(ws, filaExcel, colInicio + 1, this.estiloPorcentaje());
      } else {
        this.aplicarFormatoMoneda(ws, filaExcel, colInicio + 1, this.estiloMonedaVerde());
      }

      const labelRef = XLSX.utils.encode_cell({
        r: filaExcel - 1,
        c: colInicio
      });

      if (ws[labelRef]) {
        ws[labelRef].s = {
          ...(ws[labelRef].s || {}),
          font: { bold: true },
          border: this.bordeCompleto()
        };
      }
    });
  }
  agregarMerge(
    ws: XLSX.WorkSheet,
    filaInicio: number,
    colInicio: number,
    filaFin: number,
    colFin: number
  ): void {
    if (!ws['!merges']) {
      ws['!merges'] = [];
    }

    ws['!merges'].push({
      s: { r: filaInicio - 1, c: colInicio },
      e: { r: filaFin - 1, c: colFin }
    });
  }
  lstAseguradoras: any = [];
  haySeleccionados(): boolean {
    return this.lstRamosSugeridos.some((x: any) => x.seleccionado);
  }

  crearRamosSeleccionados() {
    const seleccionados = this.lstRamosSugeridos.filter((x: any) => x.seleccionado);

    let creados = 0;
    seleccionados.forEach((element: any) => {

      const inicioVigencia = element.fcDesde?.split('T')[0] ?? '';
      const finVigencia = element.fcHasta?.split('T')[0] ?? '';
      const cdRamo = element.cdRamo ?? '';

      const yaExiste = this.lstIngresosGastos.some((item: any) => {
        const nuevoInicio = new Date(inicioVigencia);
        const nuevoFin = new Date(finVigencia);

        const existenteInicio = new Date(item.inicioVigencia);
        const existenteFin = new Date(item.finVigencia);

        return Number(item.ramo) === Number(cdRamo) && item.poliza === element.poliza &&
          nuevoInicio <= existenteFin &&
          nuevoFin >= existenteInicio;
      });

      if (yaExiste) {
        this.toastrService.warning(
          `El ramo ${element.nombreRamo} ya está creado con una vigencia y número de poliza que se cruza con la que desea ingresar.`,
          'Ramo ya existe'
        );
        return;
      }

      const ingreso = {
        idIngreso: '',
        cliente: this.ingresoForm.getRawValue().cliente,
        nombreCliente: this.clienteSeleccionado.NOMBRES,
        idCliente: this.clienteSeleccionado.id,
        ramo: cdRamo,
        nombreRamo: element.nombreRamo ?? '',
        aseguradora: element.cdAseguradora ?? '',
        nombreAseguradora: element.nombreAseguradora ?? '',
        inicioVigencia,
        finVigencia,
        primaMensual: element.primaMensual ?? '',
        primaAnual: element.primaAnual ?? '',
        porcentajeComision: element.porcCom ?? 0,
        comision: element.comisionMensual ?? 0,
        comisionAnual: element.comisionAnual ?? 0,
        poliza: element.poliza ?? 0,
        gastos: [],
        archivosAprobacion: [] as File[],
        nombresUsuario: (
          (this.userCurrent?.get_persona.nombre ?? '') + ' ' +
          (this.userCurrent?.get_persona.apellido ?? '')
        ).trim()
      };

      this.lstIngresosGastos.push(ingreso);
      creados++;
    });

    // Si no se creó ninguno, no mostrar el Swal
    if (creados === 0) {
      return;
    }

    Swal.fire({
      icon: 'info',
      title: 'Ramos agregados',
      html: `
      <p>Se agregaron <b>${creados}</b> ramo(s) correctamente.</p>
      <p>Recuerde que debe agregar los gastos por cada detalle de ramos.</p>
    `,
      confirmButtonText: 'Aceptar',
      allowOutsideClick: false,
      allowEscapeKey: false
    }).then(() => {
      $('#modalRamosEstandar').modal('hide');
    });

  }
  getFilasGastosFacturas(ing: any): any[] {
    const filas: any[] = [];

    const gastos = ing?.gastos ?? [];
    const facturas = ing?.facturas ?? [];

    gastos.forEach((gasto: any, indiceGasto: number) => {
      const facturasDelGasto = facturas.filter(
        (factura: any) =>
          Number(factura.idGasto) === Number(gasto.id)
      );

      const grupoColor = indiceGasto % 5;

      if (facturasDelGasto.length === 0) {
        filas.push({
          gasto,
          factura: null,
          mostrarGasto: true,
          grupoColor
        });

        return;
      }

      facturasDelGasto.forEach((factura: any, index: number) => {
        filas.push({
          gasto,
          factura,
          mostrarGasto: index === 0,
          grupoColor
        });
      });
    });

    return filas;
  }

  getGastosConFacturas(ing: any): any[] {
    const gastos = ing?.gastos ?? [];
    const facturas = ing?.facturas ?? [];

    return gastos.map((gasto: any, indiceGasto: number) => {
      const facturasDelGasto = facturas.filter(
        (factura: any) =>
          Number(factura.idGasto) === Number(gasto.id)
      );

      return {
        gasto,
        facturas: facturasDelGasto,
        cantidadFilas: Math.max(facturasDelGasto.length, 1),
        grupoColor: indiceGasto % 5
      };
    });
  }

  tieneFacturasAsignadas(ing: any): boolean {
    const gastos = ing?.gastos ?? [];
    const facturas = ing?.facturas ?? [];

    return facturas.some((factura: any) =>
      gastos.some(
        (gasto: any) =>
          Number(gasto.id) === Number(factura.idGasto)
      )
    );
  }

  getTotalFacturasAsignadas(ing: any): number {
    const gastos = ing?.gastos ?? [];
    const facturas = ing?.facturas ?? [];

    return facturas
      .filter((factura: any) =>
        gastos.some(
          (gasto: any) =>
            Number(gasto.id) === Number(factura.idGasto)
        )
      )
      .reduce(
        (total: number, factura: any) =>
          total + Number(factura.valor ?? 0),
        0
      );
  }
  /**
   * Convierte el valor recibido a número.
   * Evita resultados NaN cuando el valor es null o undefined.
   */
  private convertirANumero(valor: unknown): number {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
  }

  /**
   * Suma todas las facturas asignadas a un gasto.
   */
  getTotalFacturasGasto(grupo: any): number {
    const facturas = grupo?.facturas ?? [];

    const total = facturas.reduce(
      (acumulado: number, factura: any) =>
        acumulado + this.convertirANumero(factura?.valor),
      0
    );

    return Math.round(total * 100) / 100;
  }

  /**
   * Calcula el saldo individual:
   * valor del gasto - total de sus facturas.
   */
  getSaldoGasto(grupo: any): number {
    const valorGasto = this.convertirANumero(grupo?.gasto?.valor);
    const totalFacturas = this.getTotalFacturasGasto(grupo);

    return Math.round((valorGasto - totalFacturas) * 100) / 100;
  }

  /**
   * Calcula el saldo general de todos los gastos y facturas.
   */
  getSaldoTotal(ing: any): number {
    const totalGastos = this.convertirANumero(
      this.getTotalGastos(ing?.gastos ?? [])
    );

    const totalFacturas = this.convertirANumero(
      this.getTotalFacturasAsignadas(ing)
    );

    return Math.round((totalGastos - totalFacturas) * 100) / 100;
  }
  obtenerMesVigencia(fcDesde: string | Date, fcHasta: string | Date): string {

    const desde = new Date(fcDesde);
    const hasta = new Date(fcHasta);
    const hoy = new Date();

    // Quitar horas para comparar únicamente fechas
    desde.setHours(0, 0, 0, 0);
    hasta.setHours(23, 59, 59, 999);
    hoy.setHours(12, 0, 0, 0);

    let fechaResultado: Date;

    if (hoy >= desde && hoy <= hasta) {
      // Estamos dentro de la vigencia
      fechaResultado = hoy;
    } else if (hoy > hasta) {
      // Ya terminó la vigencia
      fechaResultado = hasta;
    } else {
      // Aún no inicia la vigencia
      fechaResultado = desde;
    }

    return fechaResultado.toLocaleDateString('es-ES', {
      month: 'long'
    });
  }
  getTotalFacturasGrupo(grupo: any): number {
    return (grupo?.facturas ?? []).reduce(
      (total: number, factura: any) =>
        total + (Number(factura?.valor) || 0),
      0
    );
  }

}
