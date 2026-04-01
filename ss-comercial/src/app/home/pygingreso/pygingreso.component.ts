import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppComponent } from 'src/app/app.component';
import { AuthService } from 'src/app/services/auth.service';
import { ToastrService } from 'src/app/services/toastr.service';

@Component({
  selector: 'app-pygingreso',
  templateUrl: './pygingreso.component.html',
  styleUrls: ['./pygingreso.component.css']
})
export class PygingresoComponent {
  ingresoForm!: FormGroup;
  gastoForm!: FormGroup;
  pygForm!: FormGroup;
  userCurrent: any;
  lstGastos: any;
  lstPYG: any;
  /**
   *
   */
  constructor(private authService: AuthService,
    private fb: FormBuilder,
    private toastrService: ToastrService,
    private appComponent: AppComponent,
  ) {

  }
  ngOnInit(): void {
    this.obtenerUsuario();
    this.ingresoForm = this.fb.group({
      primaMensual: [0, ''],
      primaAnual: [0, ''],
      porcentajeComision: [0, ''],
      comision: [0, ''],
    });
    this.gastoForm = this.fb.group({
      descripcion: ['', Validators.required],
      valor: [null, [Validators.required, Validators.min(0.01)]]
    });
    this.pygForm = this.fb.group({
      descripcion: ['', Validators.required],
      valor: [null, [Validators.required, Validators.min(0.01)]]
    });
    this.lstPYG = [];
    this.lstGastos = [];
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
    const valorComision = ((mensualControl?.value * porcentaje?.value) / 100).toFixed(2);

    comision?.setValue(valorComision, { emitEvent: false });
  }
  //GAstos
  agregarPYG() {
    if (this.pygForm.valid) {
      let gasto = {
        descripcion: this.pygForm.value.descripcion,
        valor: this.pygForm.value.valor,
      }
      this.lstPYG.push(gasto);
      this.pygForm.reset({
        descripcion: '',
        valor: null,
      });
      console.log('this.lstGastos', this.lstPYG);
      this.toastrService.success(
        'Correcto!',
        'Contacto agregado correctamente.'
      );
    } else {
      this.appComponent.validateAllFormFields(this.pygForm);
      this.toastrService.error(
        'Error al agregar el gasto',
        'No se llenaron todos los campos necesarios.'
      );
    }
  }
  esEdicion: boolean = false;
  indexEditar: any;
  editarPYG(item: any) {
    this.esEdicionPYG = true;
    this.indexEditarPYG = item;
    let itemEditar = this.lstPYG[this.indexEditarPYG];
    this.pygForm.patchValue({
      descripcion: itemEditar.descripcion,
      valor: itemEditar.valor,
    });
    console.log('item', item);
  }
  actualizarPYG() {
    this.esEdicionPYG = false;
    let gasto = {
      descripcion: this.pygForm.value.descripcion,
      valor: this.pygForm.value.valor,
    }
    this.lstPYG[this.indexEditarPYG] = gasto;
    this.pygForm.reset({
      descripcion: '',
      valor: null,
    });
    this.toastrService.success(
      'Correcto!',
      'PYG agregado correctamente.'
    );
  }
  eliminarPYG(item: any) {
    this.lstPYG.splice(item, 1);
  }
  cancelarActualizarPYG() {
    this.esEdicionPYG = false;
    this.pygForm.reset({
      descripcion: '',
      valor: null,
    });
  }
  get totalPYG(): number {
    return this.lstPYG.reduce((total: any, gasto: any) => total + Number(gasto.valor), 0) - this.lstGastos.reduce((total: any, gasto: any) => total + Number(gasto.valor), 0);
  }
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
  esEdicionPYG: boolean = false;
  indexEditarPYG: any;
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
    return this.lstGastos.reduce((total: any, gasto: any) => total + Number(gasto.valor), 0);
  }
    get totalIngreso(): number {
    return this.lstPYG.reduce((total: any, gasto: any) => total + Number(gasto.valor), 0);
  }
  get porcentajeInversion(): number {
    const totalGastos = this.lstGastos.reduce((total:any, gasto:any) => total + Number(gasto.valor), 0);
    const presupuesto = this.lstPYG.reduce((total: any, gasto: any) => total + Number(gasto.valor), 0);

    if (!presupuesto) {
      return 0;
    }

    return Math.round((totalGastos / presupuesto) * 100 * 100) / 100;
  }
}
