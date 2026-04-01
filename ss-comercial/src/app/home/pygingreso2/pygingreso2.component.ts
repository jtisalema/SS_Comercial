import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppComponent } from 'src/app/app.component';
import { AuthService } from 'src/app/services/auth.service';
import { ToastrService } from 'src/app/services/toastr.service';
import { Subject } from 'rxjs';
import { debounceTime, switchMap, tap } from 'rxjs/operators';
import { PygService } from 'src/app/services/pyg.service';
import { ChecklistService } from 'src/app/services/checklist.service';
import { LoadingService } from 'src/app/services/loading.service';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-pygingreso2',
  templateUrl: './pygingreso2.component.html',
  styleUrls: ['./pygingreso2.component.css']
})
export class PygingresoComponent2 {
  ingresoForm!: FormGroup;
  gastoForm!: FormGroup;
  userCurrent: any;
  lstGastos: any;
  lstPYG: any;
  clientes: any[] = [];
  clientesInput$ = new Subject<string>();
  loadingClientes = false;
  lstRamos: any = [];
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
  ) {

  }
  ngOnInit(): void {
    this.obtenerUsuario();
    this.obtenerInformacionInicial();
  }
  obtenerInformacionInicial() {
    this.loadingService.showLoading();
    this.ingresoForm = this.fb.group({
      cliente: [null, Validators.required],
      nombreCliente: [],
      ramo: [null, Validators.required],
      nombreRamo: [],
      inicioVigencia: [new Date().toISOString().split('T')[0], Validators.required],
      finVigencia: ['', Validators.required],
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
      console.log(this.lstRamos);
    }, (error: any) => {
      this.toastrService.error('ERROR', 'Error al obtener los Ramos!');
    });
    setTimeout(() => {
      this.loadingService.hideLoading();
    }, 1500);
  }
  async obtenerUsuario() {
    this.userCurrent = await this.authService.getUserInfor();
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
    console.log('cambioValor');
    const mensualControl = this.ingresoForm.get('primaMensual');
    console.log('mensualControl', mensualControl?.value);
    const anualControl = this.ingresoForm.get('primaAnual');
    const anual = mensualControl?.value * 12;

    anualControl?.setValue(anual, { emitEvent: false });
  }
  changePorcentaje() {
    console.log('cambioValor');
    const mensualControl = this.ingresoForm.get('primaMensual');
    console.log('mensualControl', mensualControl?.value);
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
    console.log('item', item);
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
  get totalGastos(): number {
    return this.lstIngresosGastos.reduce((totalIngresos: any, ingreso: any) => {
      const sumaGastos = ingreso.gastos.reduce((totalGastos: any, gasto: any) => Number(totalGastos) + Number(gasto.valor), 0);
      return totalIngresos + sumaGastos;
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
        console.log(this.ingresoForm.getRawValue().cliente);
        const ramo = this.lstRamos.find((r: any) => r.cdRamo === this.ingresoForm.value.ramo);
        let ingreso = {
          cliente: this.ingresoForm.getRawValue().cliente,
          nombreCliente: this.clienteSeleccionado.NOMBRES,
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
        console.log('ingreso', ingreso);
        this.lstIngresosGastos.push(ingreso);
        this.limpiarFormIngreso();
        console.log('ingresos', this.lstIngresosGastos);
      } else {
        const camposInvalidos: string[] = [];

        Object.keys(this.ingresoForm.controls).forEach(campo => {
          const control = this.ingresoForm.get(campo);

          if (control && control.invalid) {
            camposInvalidos.push(campo);
          }
        });

        console.log('Campos faltantes:', camposInvalidos);
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
  clienteSeleccionado: any;
  onClienteChange(cliente: any) {
    this.clienteSeleccionado = cliente;
    console.log(this.clienteSeleccionado);
  }
  eliminarIngreso(dato: number) {
    console.log('Eliminar índice:', dato);

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
  editarIngresoGasto:boolean=false;
  indexIGActualizar:any;
  editarIngreso(index: any) {
    this.indexIGActualizar = index;
    this.editarIngresoGasto = true;
    let dato = JSON.parse(JSON.stringify(this.lstIngresosGastos[index]));
    console.log('dato',dato);
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
      comision:dato.comision,
      comisionAnual: dato.comisionAnual,
      gastos: dato.gastos
    });
    this.lstGastos = dato.gastos;
  }
  actualizarIngresoGasto(){
    const ramo = this.lstRamos.find((r: any) => r.cdRamo === this.ingresoForm.value.ramo);
          let ingreso = {
          cliente: this.ingresoForm.getRawValue().cliente,
          nombreCliente: this.clienteSeleccionado.NOMBRES,
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
  cancelarActualizarIG(){
    this.editarIngresoGasto=false;
    this.limpiarFormIngreso();
  }
}
