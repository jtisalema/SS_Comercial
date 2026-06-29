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
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

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

          console.log({
            descripcion,
            fecha,
            valor
          });
          let detFactura = {
            idRamo: this.ramoSeleccionado.idRamo,
            descripcion: descripcion,
            valor: valor,
            idDetalleFact: '',
            fechaFactura: fecha,
            numero_documento: '',
          };

          if (!this.ramoSeleccionado.facturas) {
            this.ramoSeleccionado.facturas = [];
          }
          console.log('reamoSeleccionado', this.ramoSeleccionado);
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

      order: [
        [0, 'desc']
      ],

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
      gastos: [[], '']
    });
    this.gastoForm = this.fb.group({
      descripcion: ['', Validators.required],
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
        console.log('filtros', res);
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
        console.log('ramos', ramos);
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
      let gasto = {
        descripcion: this.gastoForm.value.descripcion,
        valor: this.gastoForm.value.valor,
      }
      this.lstGastos.push(gasto);
      this.gastoForm.reset({
        descripcion: '',
        valor: null,
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
    });
  }
  actualizarGasto() {
    this.esEdicion = false;
    let gasto = {
      descripcion: this.gastoForm.value.descripcion,
      valor: this.gastoForm.value.valor,
    }
    this.lstGastos[this.indexEditar] = gasto;
    this.gastoForm.reset({
      descripcion: '',
      valor: null,
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
    });
  }
  get totalDetalleGastos(): number {
    return this.lstGastos.reduce(
      (a: number, b: any) => a + Number(b.valor),
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
        const ramo = this.lstRamos.find((r: any) => r.cdRamo === this.ingresoForm.value.ramo);
        let ingreso = {
          idIngreso: '',
          cliente: this.ingresoForm.getRawValue().cliente,
          nombreCliente: this.clienteSeleccionado.NOMBRES,
          idCliente: this.clienteSeleccionado.ID,
          ramo: this.ingresoForm.value.ramo,
          nombreRamo: ramo.nmRamo,
          inicioVigencia: this.ingresoForm.value.inicioVigencia,
          finVigencia: this.ingresoForm.value.finVigencia,
          primaMensual: this.ingresoForm.value.primaMensual,
          primaAnual: this.ingresoForm.value.primaAnual,
          porcentajeComision: this.ingresoForm.value.porcentajeComision,
          comision: this.ingresoForm.value.comision,
          comisionAnual: this.ingresoForm.value.comisionAnual,
          gastos: this.lstGastos,
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
    this.ingresoForm.get('cliente')?.disable();
    this.ingresoForm.get('cliente')?.updateValueAndValidity();

    this.ingresoForm.patchValue({
      ramo: null,
      inicioVigencia: new Date().toISOString().split('T')[0],
      // finVigencia: '',
      // primaMensual: 0,
      // primaAnual: 0,
      // porcentajeComision: 0,
      // comision: 0,
      // comisionAnual: 0,
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
  onClienteChange(cliente: any) {
    this.clienteSeleccionado = cliente;//apellidos , nombnres , id
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

  editarIngreso(index: any) {
    this.indexIGActualizar = index;
    this.editarIngresoGasto = true;
    let dato = JSON.parse(JSON.stringify(this.lstIngresosGastos[index]));
    this.ingresoForm.patchValue({
      // cliente: dato.cliente,
      // nombreCliente: dato.nombreClienete,
      ramo: dato.ramo,
      nombreRamo: dato.nombreRamo,
      inicioVigencia: dato.inicioVigencia,
      finVigencia: dato.finVigencia,
      primaMensual: dato.primaMensual,
      primaAnual: dato.primaAnual,
      porcentajeComision: dato.porcentajeComision,
      comision: dato.comision,
      comisionAnual: dato.comisionAnual,
      gastos: dato.gastos
    });
    this.lstGastos = dato.gastos;
    // this.lstGastos = dato.gastos.filter(
    //   (item: any) => !item.idDetalleFact
    // );
  }

  actualizarIngresoGasto() {
    const ramo = this.lstRamos.find((r: any) => r.cdRamo === this.ingresoForm.value.ramo);
    let ingreso = {
      cliente: this.ingresoForm.getRawValue().cliente,
      nombreCliente: this.clienteSeleccionado?.NOMBRES ?? '',
      idCliente: this.clienteSeleccionado.ID,
      ramo: this.ingresoForm.value.ramo,
      nombreRamo: ramo.nmRamo,
      inicioVigencia: this.ingresoForm.value.inicioVigencia,
      finVigencia: this.ingresoForm.value.finVigencia,
      primaMensual: this.ingresoForm.value.primaMensual,
      primaAnual: this.ingresoForm.value.primaAnual,
      porcentajeComision: this.ingresoForm.value.porcentajeComision,
      comision: this.ingresoForm.value.comision,
      comisionAnual: this.ingresoForm.value.comisionAnual,
      gastos: this.lstGastos
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
  guardarPYG() {
    if (!this.ingresoForm.getRawValue().cliente) {
      this.toastrService.error('ERROR', 'Debe ingresar/seleccionar un cliente!');
      return;
    }
    if (this.lstIngresosGastos.length < 1) {
      this.toastrService.error('ERROR', 'Debe ingresar por lo menos 1 detalle de gastos!');
      return;
    }
    let formD = new FormData();
    formD.append('cliente', JSON.stringify(this.ingresoForm.getRawValue().cliente));
    formD.append('nombreCliente', this.clienteSeleccionado.NOMBRES);
    formD.append('idCliente', this.clienteSeleccionado.ID);
    formD.append('idUsuario', this.userCurrent.id);
    formD.append('lstIngresosGastos', JSON.stringify(this.lstIngresosGastos));
    this.pygService.guardarPYG(formD).subscribe((res: any) => {
      Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: 'Registro Ingresado Correctamente',
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
    if (this.esFinanciero) {
      let formD = new FormData();
      formD.append('idRegistro', this.idRegistro);
      formD.append('ramo', this.selectRamo);
      formD.append('vigencia', this.selectVigencia);
      formD.append('cliente', this.clienteSeleccionado.ID);

      this.pygService.obtenerRegistrosPYGFinanciero(formD).subscribe((res: any) => {
        let respuesta = res.data;
        console.log('respuestaFinanciero', respuesta);
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

          let ingreso = {
            idIngreso: respuesta.idRegistro,
            cliente: respuesta.idCliente ?? '',
            nombreCliente: respuesta.cliente ?? '',
            ramo: element.ramo ?? '',
            idRamo: element.idRegistroReg ?? '',
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
            facturas: element.facturas
          }
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
        this.loadingService.hideLoading();
      }, 1000);
    } else {
      this.pygService.obtenerRegistrosPYGbyID(this.idRegistro).subscribe((res: any) => {
        let respuesta = res.data;
        console.log('respuesta', respuesta);
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
          let ramoCargado = {
            id: element.ramo,
            nombre: nombreRamo
          }
          this.lstRamosCargados.push(ramoCargado);
          console.log('lstRamosCargados', this.lstRamosCargados);
          let ingreso = {
            idIngreso: respuesta.idRegistro,
            cliente: respuesta.idCliente ?? '',
            nombreCliente: respuesta.cliente ?? '',
            ramo: element.ramo ?? '',
            idRamo: element.id ?? '',
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
            facturas: element.facturas
          }
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
        setTimeout(() => {
          this.loadingService.hideLoading();
        }, 1000);
      }, (error: any) => {
        this.loadingService.hideLoading();
        this.toastrService.error('ERROR', 'No se pudo cargar el registro!');
        this.router.navigate(['/home/pyg/seguimiento']);
      });
    }


  }
  actualizarPYG() {
    console.log('actualizar');
  }
  asignarFacturas(id: any) {
    this.ramoSeleccionado = this.lstIngresosGastos[id];
    $('#modalFacturas').modal('show');
  }
  seleccionarFactura(id: any) {
    let factura = this.lstFacturasCliente.find(
      (element: any) => element.id == id
    );
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
    };

    if (!this.ramoSeleccionado.facturas) {
      this.ramoSeleccionado.facturas = [];
    }
    console.log('reamoSeleccionado', this.ramoSeleccionado);
    this.ramoSeleccionado.facturas.push(detFactura);

    // Refrescar tabla
    this.refrescarTablaFacturas();
    this.toastrService.success(
      'Correcto!',
      'Datos de factura agregados correctamente.'
    );
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
          ...this.lstFacturasCliente,
          ...res.data.filter(
            (n: any) => !this.lstFacturasCliente.some((o: any) => o.id == n.id)
          )
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
    console.log('facti', facturas);
    console.log('ing', ing);
    let factEscogida = ing.facturas[index];
    console.log('factEscogida', factEscogida);
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
              console.log('this.lstFacturasBorradas', this.lstFacturasBorradas);
      ing.facturas = ing.facturas.filter(
        (_: any, i: number) => i !== index
      );
      }

    }

    this.refrescarTablaFacturas();

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
    console.log(this.lstIngresosGastos);
    formD.append('datos', JSON.stringify(this.lstIngresosGastos));
    formD.append('facturasBorradas', this.lstFacturasBorradas);
    this.pygService.guardarFacturasPYG(formD).subscribe((res: any) => {
      
    }, (error: any) => {
      this.loadingService.hideLoading();
      this.toastrService.error('ERROR', 'No se pudo guardar la informacion!');
      this.router.navigate(['/home/pyg/seguimiento']);
    });
  }
exportarDetalles(): void {
  const wb = XLSX.utils.book_new();

  const wsDetalle: XLSX.WorkSheet = {};
  const wsResumen: XLSX.WorkSheet = {};

  // =========================
  // HOJA 1: DETALLES POR RAMO
  // =========================

  XLSX.utils.sheet_add_aoa(wsDetalle, [['Detalles Gastos por Ramo']], {
    origin: 'A1'
  });

  let filaBase = 3;

  // Ramos en dos columnas: izquierda A:C, derecha E:G
  for (let i = 0; i < this.lstIngresosGastos.length; i += 2) {
    const ramoIzquierdo = this.lstIngresosGastos[i];
    const ramoDerecho = this.lstIngresosGastos[i + 1];

    const filaFinalIzq = ramoIzquierdo
      ? this.agregarRamoExcel(wsDetalle, ramoIzquierdo, filaBase, 0)
      : filaBase;

    const filaFinalDer = ramoDerecho
      ? this.agregarRamoExcel(wsDetalle, ramoDerecho, filaBase, 4)
      : filaBase;

    filaBase = Math.max(filaFinalIzq, filaFinalDer) + 2;
  }

  wsDetalle['!cols'] = [
    { wch: 22 }, // A
    { wch: 18 }, // B
    { wch: 18 }, // C
    { wch: 4 },  // D separación
    { wch: 22 }, // E
    { wch: 18 }, // F
    { wch: 18 }  // G
  ];

  // =========================
  // HOJA 2: RESÚMENES
  // =========================

  XLSX.utils.sheet_add_aoa(wsResumen, [['Resumen PYG']], {
    origin: 'A1'
  });

  this.agregarResumenPYGExcel(wsResumen, 3, 0);

  XLSX.utils.sheet_add_aoa(wsResumen, [['Resumen Gastos']], {
    origin: 'D1'
  });

  this.agregarResumenGastosExcel(wsResumen, 3, 3);

  wsResumen['!cols'] = [
    { wch: 35 }, // A
    { wch: 18 }, // B
    { wch: 4 },  // C separación
    { wch: 35 }, // D
    { wch: 18 }  // E
  ];

  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle Ramos');
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  XLSX.writeFile(wb, 'reporte_pyg.xlsx');
}
agregarRamoExcel(
  ws: XLSX.WorkSheet,
  ing: any,
  filaInicio: number,
  colInicio: number
): number {
  let fila = filaInicio;

  const gastos = ing.gastos || [];
  const facturas = ing.facturas || [];

  // Nombre del ramo
  XLSX.utils.sheet_add_aoa(ws, [[ing.nombreRamo]], {
    origin: {
      r: fila - 1,
      c: colInicio
    }
  });

  fila++;

  XLSX.utils.sheet_add_aoa(ws, [['Detalle de ingresos, gastos y facturas']], {
    origin: {
      r: fila - 1,
      c: colInicio
    }
  });

  fila += 2;

  // Información superior
  XLSX.utils.sheet_add_aoa(
    ws,
    [
      ['Inicio Vigencia', ing.inicioVigencia, 'Fin Vigencia', ing.finVigencia],
      ['Prima Mensual', Number(ing.primaMensual || 0), 'Comisión Mensual', Number(ing.comision || 0)],
      ['Prima Anual', Number(ing.primaAnual || 0), 'Comisión Anual', Number(ing.comisionAnual || 0)]
    ],
    {
      origin: {
        r: fila - 1,
        c: colInicio
      }
    }
  );

  fila += 5;

  // Gastos proyectados
  XLSX.utils.sheet_add_aoa(ws, [['Gastos Proyectados']], {
    origin: {
      r: fila - 1,
      c: colInicio
    }
  });

  fila++;

  XLSX.utils.sheet_add_aoa(ws, [['Descripción', 'Valor']], {
    origin: {
      r: fila - 1,
      c: colInicio
    }
  });

  fila++;

  gastos.forEach((gasto: any) => {
    XLSX.utils.sheet_add_aoa(
      ws,
      [[gasto.descripcion, Number(gasto.valor || 0)]],
      {
        origin: {
          r: fila - 1,
          c: colInicio
        }
      }
    );

    fila++;
  });

  const totalGastosRamo = Number(this.getTotalGastos(gastos) || 0);
  const porcentajeInversion =
    Number(this.calcularPorcentajeGastosxRamo(gastos, ing.comisionAnual) || 0) / 100;
  const restante =
    Number(this.calcularRestanteGastosxRamo(gastos, ing.comisionAnual) || 0);

  XLSX.utils.sheet_add_aoa(
    ws,
    [
      ['TOTAL', totalGastosRamo],
      ['% Inversión', porcentajeInversion],
      ['Valor Restante', restante]
    ],
    {
      origin: {
        r: fila - 1,
        c: colInicio
      }
    }
  );

  this.aplicarFormatoMoneda(ws, fila, colInicio + 1);
  this.aplicarFormatoPorcentaje(ws, fila + 1, colInicio + 1);
  this.aplicarFormatoMoneda(ws, fila + 2, colInicio + 1);

  fila += 5;

  // Facturas
  if (facturas.length > 0) {
    XLSX.utils.sheet_add_aoa(ws, [['Gastos Facturas']], {
      origin: {
        r: fila - 1,
        c: colInicio
      }
    });

    fila++;

    XLSX.utils.sheet_add_aoa(ws, [['Descripción', 'Fecha', 'Valor']], {
      origin: {
        r: fila - 1,
        c: colInicio
      }
    });

    fila++;

    facturas.forEach((fact: any) => {
      XLSX.utils.sheet_add_aoa(
        ws,
        [[fact.descripcion, fact.fechaFactura, Number(fact.valor || 0)]],
        {
          origin: {
            r: fila - 1,
            c: colInicio
          }
        }
      );

      this.aplicarFormatoMoneda(ws, fila, colInicio + 2);
      fila++;
    });

    XLSX.utils.sheet_add_aoa(
      ws,
      [['TOTAL', '', Number(this.getTotalGastos(facturas) || 0)]],
      {
        origin: {
          r: fila - 1,
          c: colInicio
        }
      }
    );

    this.aplicarFormatoMoneda(ws, fila, colInicio + 2);

    fila += 3;

    // Resumen por ramo
    const totalProyectado = Number(this.getTotalGastos(gastos) || 0);
    const totalReal = Number(this.getTotalGastos(facturas) || 0);
    const restanteFacturas = totalProyectado - totalReal;
    const porcentajeCumplimiento =
      totalProyectado > 0 ? totalReal / totalProyectado : 0;

    XLSX.utils.sheet_add_aoa(ws, [['Resumen']], {
      origin: {
        r: fila - 1,
        c: colInicio
      }
    });

    fila++;

    XLSX.utils.sheet_add_aoa(
      ws,
      [['Gastos Proyectados', 'Gastos Reales', 'Restante', '% Cumplimiento']],
      {
        origin: {
          r: fila - 1,
          c: colInicio
        }
      }
    );

    fila++;

    XLSX.utils.sheet_add_aoa(
      ws,
      [[
        totalProyectado,
        totalReal,
        restanteFacturas,
        porcentajeCumplimiento
      ]],
      {
        origin: {
          r: fila - 1,
          c: colInicio
        }
      }
    );

    this.aplicarFormatoMoneda(ws, fila, colInicio);
    this.aplicarFormatoMoneda(ws, fila, colInicio + 1);
    this.aplicarFormatoMoneda(ws, fila, colInicio + 2);
    this.aplicarFormatoPorcentaje(ws, fila, colInicio + 3);

    fila += 2;
  }

  return fila;
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
    [
      'Restante',
      Number(this.totalGastos || 0) - Number(this.totalGastosFacturas || 0)
    ],
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

    if (row[0] === '% Inversión') {
      this.aplicarFormatoPorcentaje(ws, filaExcel, colInicio + 1);
    } else {
      this.aplicarFormatoMoneda(ws, filaExcel, colInicio + 1);
    }
  });
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
      `Ingreso Anual ${ing.nombreRamo}`,
      Number(ing.comisionAnual || 0)
    ]);
  });

  data.push(
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

    if (row[0] === '% Inversión') {
      this.aplicarFormatoPorcentaje(ws, filaExcel, colInicio + 1);
    } else {
      this.aplicarFormatoMoneda(ws, filaExcel, colInicio + 1);
    }
  });
}
aplicarFormatoPorcentaje(
  ws: XLSX.WorkSheet,
  fila: number,
  col: number
): void {
  const cellRef = XLSX.utils.encode_cell({
    r: fila - 1,
    c: col
  });

  if (ws[cellRef]) {
    ws[cellRef].z = '0.00%';
  }
}
aplicarFormatoMoneda(
  ws: XLSX.WorkSheet,
  fila: number,
  col: number
): void {
  const cellRef = XLSX.utils.encode_cell({
    r: fila - 1,
    c: col
  });

  if (ws[cellRef]) {
    ws[cellRef].z = '$#,##0.00';
  }
}
}
