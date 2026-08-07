import { Component, ElementRef, ViewChild } from '@angular/core';
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
export class PygingresoComponent2 {
  @ViewChild('dataTableFacturas', { static: false }) tableFacturas!: ElementRef;
  ingresoForm!: FormGroup;
  gastoForm!: FormGroup;
  userCurrent: any;
  lstGastos: any;
  lstPYG: any;
  idRegistro: any;
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

    <div class="col-md-4">
      <input
        id="txtDescripcion"
        type="text"
        class="form-control form-control-sm"
        placeholder="Descripción"
      >
    </div>

    <div class="col-md-3">
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

    <div class="col-md-2 d-flex gap-2">
      <button id="btnAceptarFactura" class="btn btn-success btn-sm">
        Aceptar
      </button>
&nbsp;
      <button id="btnCancelarFactura" class="btn btn-warning btn-sm">
        Cancelar
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
          $('#txtValor').val('');
        });

        $('#btnAceptarFactura').on('click', () => {
          const descripcion = ($('#txtDescripcion').val() as string)?.trim();
          const fecha = ($('#txtFecha').val() as string)?.trim();
          const valor = ($('#txtValor').val() as string)?.trim();

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
            numero_documento: '',
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
      ordering:false,
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
      poliza: ['', Validators.required],
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
    }
    if (this.idRegistro) {
      this.pygService.obtenerFiltrosPYG(this.idRegistro).subscribe((res: any) => {
        let listaRamos = res.ramos;//[20, 27, 38, 55, 59, 60]
        let ramos = listaRamos.map((id: number) => {
          const ramo = this.lstRamos.find((item: any) => item.cdRamo == id);

          return {
            id: id,
            nombre: ramo ? ramo.nmRamo : ''
          };
        });
        let anios = res.anios
          .sort((a: number, b: number) => b - a)
          .map((anio: number) => ({
            id: anio,
            value: anio
          }));
        this.selectVigencia = anios[0]?.value;
        this.lstRamosCargados = ramos;
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
    const mensualControl = this.ingresoForm.get('primaMensual');
    const anualControl = this.ingresoForm.get('primaAnual');
    const anual = mensualControl?.value * 12;

    anualControl?.setValue(anual, { emitEvent: false });
    this.changePorcentaje();
  }
  changePorcentaje() {
    const mensualControl = this.ingresoForm.get('primaMensual');
    const porcentaje = this.ingresoForm.get('porcentajeComision');
    const comision = this.ingresoForm.get('comision');
    const comisionAnual = this.ingresoForm.get('comisionAnual');
    const valorComision = ((mensualControl?.value * porcentaje?.value) / 100).toFixed(2);
    const valorComisionAnual = (((mensualControl?.value * porcentaje?.value) / 100) * 12).toFixed(2);
    comision?.setValue(valorComision, { emitEvent: false });
    comisionAnual?.setValue(valorComisionAnual, { emitEvent: false });
  }
  esEdicion: boolean = false;
  indexEditar: any;
  //para EL GASTO
  agregarGasto() {
    if (this.gastoForm.valid) {
      let tipo = 'Inicial';
      if (this.ingresoRamoSeleccionado && this.idRamoSeleccionado) {
        tipo = 'Alcance';
      }
      let gasto = {
        descripcion: this.gastoForm.value.descripcion,
        valor: this.gastoForm.value.valor,
        cantidad:this.gastoForm.value.cantidad,
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
    this.esEdicion = true;
    this.indexEditar = item;
    let itemEditar = this.lstGastos[this.indexEditar];
    this.gastoForm.patchValue({
      descripcion: itemEditar.descripcion,
      valor: itemEditar.valor,
      tipo: itemEditar.tipo,
      cantidad: itemEditar.cantidad,
      fecha: itemEditar.fecha,
    });
  }
  actualizarGasto() {
    this.esEdicion = false;
    let tipo = 'Inicial';
    if (this.ingresoRamoSeleccionado && this.idRamoSeleccionado) {
      tipo = 'Alcance';
    }

    let gasto = {
      descripcion: this.gastoForm.value.descripcion,
      valor: this.gastoForm.value.valor,
      cantidad: this.gastoForm.value.cantidad,
      tipo: tipo,
      fecha: this.formatearFechaExcel(new Date())
    }
    this.lstGastos[this.indexEditar] = gasto;
    this.gastoForm.reset({
      descripcion: '',
      valor: null,
      cantidad: 1,
      tipo: ''
    });
    this.toastrService.success(
      'Correcto!',
      'Contacto agregado correctamente.'
    );
  }
  eliminarGasto(item: any) {
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
  lstIngresosGastos: any = [];
  guardarIngresoGastos() {
    try {
      this.loadingService.showLoading();
      if (this.lstGastos.length < 1) {
        this.toastrService.error('Error', 'Debe agregar el detalle de gastos');
        return;
      }
      if (this.ingresoForm.valid) {
        const ramo = this.lstRamos.find((r: any) => r.cdRamo == this.ingresoForm.value.ramo);
        const aseguradora = this.lstAseguradoras.find((r: any) => r.id == this.ingresoForm.value.aseguradora);
        let ingreso = {
          idIngreso: '',
          cliente: this.ingresoForm.getRawValue().cliente,
          nombreCliente: this.clienteSeleccionado.NOMBRES,
          idCliente: this.clienteSeleccionado.ID,
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
          gastos: this.lstGastos,
          nombresUsuario: (
            (this.userCurrent?.get_persona.nombre ?? '') + ' ' +
            (this.userCurrent?.get_persona.apellido ?? '')
          ).trim()
        }
        this.lstIngresosGastos.push(ingreso);
        this.limpiarFormIngreso();
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
      gastos: []
    });
    this.lstGastos = [];
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
    let totalGastos = gastos?.reduce((total, gasto) => total + Number(gasto.valor), 0);
    return (totalGastos / comision) * 100;
  }
  calcularRestanteGastosxRamo(gastos: any[], comision: any): number {
    let totalGastos = gastos?.reduce((total, gasto) => total + Number(gasto.valor), 0);
    return comision - totalGastos;
  }
  clienteSeleccionado: any;
  lstRamosSugeridos: any = [];

  onClienteChange(cliente: any) {
    this.lstRamosSugeridos = [];
    this.clienteSeleccionado = cliente;//apellidos , nombnres , id
    this.cargarRamosBase(1);

  }
  cargarRamosBase(abrir: number) {

    if (this.clienteSeleccionado?.ID) {
      this.loadingService.showLoading();
      this.pygService.obtenerPolizasSugeridas(this.clienteSeleccionado.ID)
        .subscribe((res: any) => {
          const hoy = new Date();
          // Traigo todas las polizas del cliente, agrupo por numero Poliza y obtengo la que tenga el FC_desde mayor
          // Fecha mínima permitida: hace 1 año desde hoy
          const fechaLimite = new Date();
          fechaLimite.setFullYear(hoy.getFullYear() - 1);

          let polizas = Object.values(
            res.resultado
              .filter((item: any) =>
                new Date(item.fcDesde) >= fechaLimite
              )
              .reduce((acc: any, item: any) => {

                const poliza = item.poliza;

                if (
                  !acc[poliza] ||
                  new Date(item.fcDesde) > new Date(acc[poliza].fcDesde)
                ) {
                  acc[poliza] = item;
                }

                return acc;

              }, {})
          );
          this.lstRamosSugeridos = [];
          polizas.forEach((element: any) => {
            const fechaBase = new Date(element.fcDesde);

            const fechaDesdeFormateada = fechaBase
              .toLocaleDateString('es-EC')
              .split('/')
              .reverse()
              .join('-');

            const fechaHasta = new Date(fechaBase);
            //fechaHasta.setMonth(fechaHasta.getMonth() + 2);
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

            this.pygService.obtenerFacturasProdPagada(this.clienteSeleccionado.ID, element.poliza, fechaDesdeFormateada, fechaHastaFormateada)
              .subscribe((res: any) => {
                if (res.length > 0) {///si hay 1 factura a partir de la emision
                  const tiposExcluir = ['C_MAESTRA', 'RENOVACION MST'];
                  const facturasFiltradas = res.resultado.filter(
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
                } else {//si no hay tomo maxmo 6 hacia atras y hago las comparativas
                  this.pygService.obtenerFacturasProdPagada(this.clienteSeleccionado.ID, element.poliza, fechaAtrasFormateada, fechaDesdeFormateada)
                    .subscribe((res: any) => {
                      const tiposExcluir = ['C_MAESTRA', 'RENOVACION MST'];
                      const facturasFiltradas = res.resultado.filter(
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
                      const registros = (facturasAgrupadas as any[]).sort(
                        (a, b) => new Date(a.fcDesde).getTime() - new Date(b.fcDesde).getTime()
                      );
                      const primas = registros.map(x => x.primaMensual);
                      let subidas = 0;
                      let bajadas = 0;
                      for (let i = 1; i < primas.length; i++) {
                        if (primas[i] > primas[i - 1]) subidas++;
                        else if (primas[i] < primas[i - 1]) bajadas++;
                      }

                      const ultimo = registros[registros.length - 1];

                      let resultado;

                      if (subidas === 0 || bajadas === 0) {
                        // Tendencia clara (sube o baja)
                        resultado = {
                          ...ultimo,
                          estadoCrecimiento: subidas > 0 ? 'SUBE' : 'BAJA'
                        };
                      } else {
                        // Comportamiento mixto
                        const promedioPrima =
                          primas.reduce((a, b) => a + b, 0) / primas.length;

                        const promedioComision =
                          registros.reduce((a: number, b: any) => a + b.comisionMensual, 0) /
                          registros.length;

                        resultado = {
                          ...ultimo,
                          primaMensual: Number(promedioPrima.toFixed(2)),
                          primaAnual: Number((promedioPrima * 12).toFixed(2)),
                          valPrima: Number(promedioPrima.toFixed(2)),
                          comisionMensual: Number(promedioComision.toFixed(2)),
                          comisionAnual: Number((promedioComision * 12).toFixed(2)),
                          estadoCrecimiento: 'PROMEDIO'
                        };
                      }
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
    this.ingresoRamoSeleccionado = JSON.parse(JSON.stringify(this.lstIngresosGastos[index]));
    this.idRamoSeleccionado = this.ingresoRamoSeleccionado.idRamo ?? '';
    if (this.idRamoSeleccionado) {
      Swal.fire({
        title: "Aviso!",
        text: "Los nuevos registros de gastos se ingresan como alcance al PYG!",
        icon: "warning"
      });
    }
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
    this.lstGastos = this.ingresoRamoSeleccionado.gastos;
    // this.lstGastos = dato.gastos.filter(
    //   (item: any) => !item.idDetalleFact
    // );
  }

  actualizarIngresoGasto() {
    const ramo = this.lstRamos.find((r: any) => r.cdRamo === this.ingresoForm.value.ramo);
    const aseguradora = this.lstAseguradoras.find((r: any) => r.id == this.ingresoForm.value.aseguradora);

    let ingreso = {
      cliente: this.ingresoForm.getRawValue().cliente,
      nombreCliente: this.clienteSeleccionado?.NOMBRES ?? '',
      idCliente: this.clienteSeleccionado.ID,
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
      gastos: this.lstGastos,
      facturas: this.ingresoRamoSeleccionado.facturas,
      poliza: this.ingresoForm.value.poliza,
      nombresUsuario: (
        (this.userCurrent?.get_persona.nombre ?? '') + ' ' +
        (this.userCurrent?.get_persona.apellido ?? '')
      ).trim()
    }
    this.lstIngresosGastos[this.indexIGActualizar] = ingreso;
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

  guardarPYG() {
    if (this.ingresoForm.invalid && this.lstIngresosGastos.length < 1) {
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
    if (this.lstIngresosGastos.length < 1) {

      return;
    }


    let formD = new FormData();
    formD.append('idRegistro', this.ingresoForm.value.id ?? '');
    formD.append('cliente', JSON.stringify(this.ingresoForm.getRawValue().cliente));
    formD.append('aseguradora', this.ingresoForm.value.aseguradora);
    formD.append('nombreCliente', this.clienteSeleccionado.NOMBRES);
    formD.append('idCliente', this.clienteSeleccionado.ID);
    formD.append('idUsuario', this.userCurrent.id);
    formD.append('lstIngresosGastos', JSON.stringify(this.lstIngresosGastos));
    // return;
    this.pygService.guardarPYG(formD).subscribe((res: any) => {
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
    }, (error: any) => {
      this.loadingService.hideLoading();
      this.toastrService.error('ERROR', 'No se pudo actualizar el registro!');
    });
  }

  lstRamosCargados: any = [];
  lstAniosCargados: any = [];
  selectRamo: any = 999;
  selectVigencia: any;
  tieneFacturas(): boolean {
    return this.lstIngresosGastos?.some((item: any) => item.facturas?.length > 0);
  }
  cargarDatosRegistro() {
    this.lstFacturasBorradas = [];
    this.lstIngresosGastos = [];
    this.clienteSeleccionado = {};
    this.loadingService.showLoading();
    //if (this.esFinanciero) {
    let formD = new FormData();
    formD.append('idRegistro', this.idRegistro);
    formD.append('ramo', this.selectRamo);
    formD.append('vigencia', this.selectVigencia);
    formD.append('cliente', this.clienteSeleccionado.ID);

    this.pygService.obtenerRegistrosPYGFinanciero(formD).subscribe((res: any) => {
      let respuesta = res.data;
      if (respuesta) {
        this.clienteSeleccionado.NOMBRES = respuesta.cliente;
        this.clienteSeleccionado.ID = respuesta.idCliente;
        this.objCliente = {
          id: respuesta.idCliente,
          nombre: respuesta.cliente
        }
      }

      this.ingresoForm.patchValue({
        id: respuesta.id,
        cliente: respuesta.cliente ?? '',
      });
      respuesta.ramos.forEach((element: any) => {
        // para las listas 
        let nombreRamo = this.lstRamos.find((item: any) => item.cdRamo == element.ramo).nmRamo;
        let nombreAseguradora = this.lstAseguradoras.find((r: any) => r.id == element.aseguradora).alias;
        let ingreso = {
          idIngreso: respuesta.idRegistro,
          cliente: respuesta.idCliente ?? '',
          nombreCliente: respuesta.cliente ?? '',
          ramo: element.ramo ?? '',
          idRamo: element.idRegistroReg ?? '',
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
          gastos: element.gastos,
          facturas: element.facturas,
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

        this.consultarFacturasProyeccion(
          ingreso.cliente,
          ingreso.poliza,
          ingreso.inicioVigencia,
          ingreso.finVigencia
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
        ingreso.mesRevision = this.obtenerMesVigencia(
          element.inicioVigencia,
          element.finVigencia
        ).toUpperCase();
        this.lstIngresosGastos.push(ingreso);
      });
      //consulto las facturas
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
      this.cargarRamosBase(0);
      this.loadingService.hideLoading();
    }, 1000);
  }

  consultarFacturasProyeccion(
    idCliente: any,
    poliza: any,
    fcDesde: any,
    fcHasta: any
  ) {
    return this.pygService
      .obtenerFacturasProdPagada(idCliente, poliza, fcDesde, fcHasta)
      .pipe(
        map((res: any) => {
          const tiposExcluir = ['C_MAESTRA', 'RENOVACION MST'];

          const facturasFiltradas = res.resultado.filter(
            (item: any) => !tiposExcluir.includes(item.tipo)
          );

          return Object.values(
            facturasFiltradas.reduce((acc: any, item: any) => {
              const fecha = new Date(item.fcDesde);
              const hasta = new Date(fecha);
              hasta.setFullYear(hasta.getFullYear() + 1);

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

              acc[clave].priNet += Number(item.priNet || 0);
              acc[clave].valcombroker += Number(item.valComBroker || 0);
              acc[clave].registros.push(item);

              // Agregar factura evitando duplicados
              if (
                item.numFactura &&
                !acc[clave].facturas.includes(item.numFactura)
              ) {
                acc[clave].facturas.push(item.numFactura);
              }

              return acc;

            }, {})
          );

        })
      );
  }

  idGastoSeleccionado: any = '';
  asignarFacturas(id: any, idGasto?: any) {
    this.ramoSeleccionado = this.lstIngresosGastos[id];
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
    if (factura?.factura_registrada == 1) {
      Swal.fire({
        icon: 'warning',
        title: 'Factura ya registrada',
        text: 'Esta factura ya se encuentra atada a un detalle de gastos. ¿Desea volverla a ingresar en este detalle?',
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
          if (factura) {
            factura.seleccionado = 1;
          }
          let detFactura = {
            idRamo: this.ramoSeleccionado.idRamo,
            descripcion: factura.observacion,
            valor: factura.base_con_iva,
            idDetalleFact: factura.id,
            fechaFactura: factura.fecha_emision,
            numero_documento: factura.numero_documento,
            idGasto: this.idGastoSeleccionado
          };

          if (!this.ramoSeleccionado.facturas) {
            this.ramoSeleccionado.facturas = [];
          }
          this.ramoSeleccionado.facturas.push(detFactura);

          // Refrescar tabla
          this.refrescarTablaFacturas();
          this.toastrService.success(
            'Correcto!',
            'Datos de factura agregados correctamente.'
          );
        }
      });
    } else {
      if (factura) {
        factura.seleccionado = 1;
      }
      let detFactura = {
        idRamo: this.ramoSeleccionado.idRamo,
        descripcion: factura.observacion,
        valor: factura.base_con_iva,
        idDetalleFact: factura.id,
        fechaFactura: factura.fecha_emision,
        numero_documento: factura.numero_documento,
        idGasto: this.idGastoSeleccionado
      };

      if (!this.ramoSeleccionado.facturas) {
        this.ramoSeleccionado.facturas = [];
      }
      this.ramoSeleccionado.facturas.push(detFactura);

      // Refrescar tabla
      this.refrescarTablaFacturas();
      this.toastrService.success(
        'Correcto!',
        'Datos de factura agregados correctamente.'
      );
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
    formD.append('datos', JSON.stringify(this.lstIngresosGastos));
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
exportarDetalles(): void {
  const registros = this.lstIngresosGastos ?? [];

  if (!registros.length) {
    this.toastrService.warning(
      'No existen detalles de PYG para exportar.',
      'Exportación'
    );
    return;
  }

  const wb = XLSX.utils.book_new();
  const wsDetalle: XLSX.WorkSheet = {};
  const wsResumen: XLSX.WorkSheet = {};

  // Los registros del mismo ramo se colocan horizontalmente, uno junto
  // al otro. Cuando cambia el ramo, el siguiente grupo comienza debajo
  // del bloque más alto del grupo anterior.
  const gruposPorRamo = this.agruparIngresosPorRamo(registros);
  const columnasPorCuadro = 10; // 9 columnas de datos + 1 separador.
  const maxObjetosPorRamo = Math.max(
    1,
    ...gruposPorRamo.map((grupo: any[]) => grupo.length)
  );
  const ultimaColumna = (maxObjetosPorRamo * columnasPorCuadro) - 2;

  XLSX.utils.sheet_add_aoa(
    wsDetalle,
    [[`DETALLE PYG - ${this.objCliente?.nombre || 'CLIENTE'}`]],
    { origin: 'A1' }
  );

  this.agregarMerge(wsDetalle, 1, 0, 1, ultimaColumna);
  this.aplicarEstiloRangoMerge(
    wsDetalle,
    1,
    0,
    1,
    ultimaColumna,
    this.estiloTituloPrincipal()
  );

  let filaBaseGrupo = 3;
  let numeroRamo = 1;

  gruposPorRamo.forEach((grupoRamo: any[]) => {
    let filaMaximaGrupo = filaBaseGrupo;

    grupoRamo.forEach((ing: any, indiceHorizontal: number) => {
      const hojaTemporal: XLSX.WorkSheet = {};
      const filaFinalTemporal = this.agregarRamoPantallaExcel(
        hojaTemporal,
        ing,
        1,
        numeroRamo
      );

      const altoBloque = Math.max(1, filaFinalTemporal - 1);
      const colInicio = indiceHorizontal * columnasPorCuadro;

      this.copiarBloqueHoja(
        hojaTemporal,
        wsDetalle,
        filaBaseGrupo,
        colInicio
      );

      const filaFinalDestino = filaBaseGrupo + altoBloque - 1;
      filaMaximaGrupo = Math.max(filaMaximaGrupo, filaFinalDestino);
      numeroRamo++;
    });

    filaBaseGrupo = filaMaximaGrupo + 2;
  });

  wsDetalle['!cols'] = [];

  for (let i = 0; i < maxObjetosPorRamo; i++) {
    wsDetalle['!cols'].push(
      { wch: 29 }, // Descripción gasto
      { wch: 12 }, // Cantidad
      { wch: 17 }, // Tipo ingreso
      { wch: 18 }, // Valor gasto
      { wch: 34 }, // Descripción factura
      { wch: 16 }, // Fecha
      { wch: 18 }, // Valor factura
      { wch: 18 }, // Total facturas
      { wch: 17 }, // Restante
      { wch: 4 }   // Separador
    );
  }

  wsDetalle['!rows'] = wsDetalle['!rows'] || [];
  wsDetalle['!rows'][0] = { hpt: 27 };

  // =========================
  // HOJA 2: RESUMEN
  // =========================
  XLSX.utils.sheet_add_aoa(wsResumen, [['RESUMEN PYG']], {
    origin: 'A1'
  });

  this.agregarMerge(wsResumen, 1, 0, 1, 1);
  this.aplicarEstiloRangoMerge(
    wsResumen,
    1,
    0,
    1,
    1,
    this.estiloTituloPrincipal()
  );

  this.agregarResumenPYGExcel(wsResumen, 3, 0);

  XLSX.utils.sheet_add_aoa(wsResumen, [['RESUMEN GASTOS']], {
    origin: 'D1'
  });

  this.agregarMerge(wsResumen, 1, 3, 1, 4);
  this.aplicarEstiloRangoMerge(
    wsResumen,
    1,
    3,
    1,
    4,
    this.estiloTituloPrincipal()
  );

  this.agregarResumenGastosExcel(wsResumen, 3, 3);

  wsResumen['!cols'] = [
    { wch: 38 },
    { wch: 18 },
    { wch: 5 },
    { wch: 38 },
    { wch: 18 }
  ];

  wsResumen['!rows'] = [{ hpt: 26 }];

  const nombreHojaDetalle = (this.objCliente?.nombre || 'Detalle PYG')
    .toString()
    .replace(/[\\/?*[\]:]/g, '')
    .substring(0, 31)
    .trim();

  const nombreArchivo = `PYG ${(this.objCliente?.nombre || 'Cliente')
    .toString()
    .replace(/[\\/?*[\]:"]/g, '')
    .trim()}.xlsx`;

  XLSX.utils.book_append_sheet(
    wb,
    wsDetalle,
    nombreHojaDetalle || 'Detalle PYG'
  );
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  XLSX.writeFile(wb, nombreArchivo, {
    compression: true,
    bookType: 'xlsx'
  });
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
            ? `${grupo?.gasto?.tipo ?? ''}${
                grupo?.gasto?.tipo === 'Alcance' &&
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

    this.lstIngresosGastos.forEach((ing: any) => {
      data.push([
        `Ingreso Anual ${ing.nombreRamo || ''} - ${(ing.inicioVigencia || '').toString().substring(0, 4)}`,
        Number(ing.comisionAnual || 0)
      ]);
    });

    data.push(
      ['', ''],
      ['Total Ingresos', Number(this.totalIngresos || 0)],
      ['Total Gastos', Number(this.totalGastos || 0)],
      ['% Inversión', Number(this.calcularPorcentajeGastos() || 0) / 100],
      ['Total Final', Number(this.totalFinal || 0)]
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
      this.totalGastos > 0
        ? Number(this.totalGastosFacturas || 0) / Number(this.totalGastos || 1)
        : 0;

    const data: any[][] = [
      ['Total Ingresos', Number(this.totalIngresos || 0)],
      ['Total Gastos Proyectados', Number(this.totalGastos || 0)],
      ['Total Gastos Reales', Number(this.totalGastosFacturas || 0)],
      ['Restante', Number(this.totalGastos || 0) - Number(this.totalGastosFacturas || 0)],
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
        idCliente: this.clienteSeleccionado.ID,
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
