import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AcuerdoservicioService } from 'src/app/services/acuerdoservicio.service';
import { AuthService } from 'src/app/services/auth.service';
import { LoadingService } from 'src/app/services/loading.service';
import { ToastrService } from 'src/app/services/toastr.service';
import Swal from 'sweetalert2';
declare var $: any;

interface TreeNode {
  data: any;
  children?: TreeNode[];
}
@Component({
  selector: 'app-acuerdosegbeneficio',
  templateUrl: './acuerdosegbeneficio.component.html',
  styleUrls: ['./acuerdosegbeneficio.component.css']
})
export class AcuerdosegbeneficioComponent {

  constructor(private route: ActivatedRoute,
    private authService: AuthService,
    private loadingService: LoadingService,
    private acuerdoservicioService: AcuerdoservicioService,
    private fb: FormBuilder,
    private toastrService: ToastrService,
  ) {
  }
  idAcuerdo: any;
  userCurrent: any;
  lstBeneficios: any[] = [];
  lstValoresAgregados: any[] = [];
  isEditingBeneficio: boolean = false;
  isEditingValorAgregado: boolean = false;
  beneficioForm!: FormGroup;
  valorAgregadoForm!: FormGroup;
  datosAcuerdo: any;
  async ngOnInit() {
    if (this.route.snapshot.paramMap.get("id")) {
      this.idAcuerdo = this.route.snapshot.paramMap.get("id");
    }
    this.obtenerUsuario();
    this.beneficioForm = this.fb.group({
      id: [''],
      modificado: [''],
      idBeneficio: [''],
      nombreBeneficio: ['', Validators.required],
      detalleBeneficio: ['', Validators.required],
      cantidadBeneficio: ['', Validators.required],
      valorBeneficio: ['', Validators.required],
      fechaCumplimiento: ['', Validators.required],
    });
    this.valorAgregadoForm = this.fb.group({
      id: [''],
      modificado: [''],
      idValor: [''],
      nombreValor: ['', Validators.required],
      detalleValor: ['', Validators.required],
      cantidadValor: ['', Validators.required],
      valor: [''],
      fechaCumplimiento: ['', Validators.required],
    });
  }
  async obtenerUsuario() {
    this.userCurrent = await this.authService.getUserInfor();
    if (this.idAcuerdo) {
      this.cargarDatosAcuerdo();
    }
  }
  async cargarDatosAcuerdo() {
    this.loadingService.showLoading();
    this.acuerdoservicioService.obtenerDatosAcuerdobyId2(this.idAcuerdo).subscribe((res: any) => {
      this.datosAcuerdo = res?.data;
      this.lstBeneficios = this.datosAcuerdo?.beneficios;
      this.lstBeneficios = this.datosAcuerdo?.beneficios.map((item: any) => ({
        data: item,
        children: item.detalleBeneficios?.map((det: any) => ({
          data: det,
          children: [] // importante para que no cree más niveles
        })) || []
      }));
      this.lstValoresAgregados = this.datosAcuerdo?.valoresAgregados;
      this.lstValoresAgregados = this.datosAcuerdo?.valoresAgregados.map((item: any) => ({
        data: item,
        children: item.detalleValoresAgregados?.map((det: any) => ({
          data: det,
          children: [] // importante para que no cree más niveles
        })) || []
      }));
      this.loadingService.hideLoading();
    },
      (error: any) => {
        this.loadingService.hideLoading();
        this.toastrService.error('ERROR', 'Error al eliminar el detalle!');
      }
    );
  }
  beneficioSelect: any;
  valorAgregadoSelect: any;
  agregarHijo(item: any) {
    this.beneficioSelect = item?.node;
    this.abrirModalBeneficio(false);
  }
    agregarHijoVA(item: any) {
    this.valorAgregadoSelect = item?.node;
    this.abrirModalValorAgregado(false);
  }
  eliminarNodo(item: any) {

    Swal.fire({
      title: '¿Está seguro?',
      text: 'Esta acción eliminará el detalle de beneficio.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    }).then((result) => {

      if (result.isConfirmed) {

        this.lstBeneficios.forEach(padre => {
          const index = padre.children.findIndex(
            (hijo: any) => hijo.data.id == item.node.data.id
          );
          if (index !== -1) {
            padre.children.splice(index, 1);
          }
        });

        let formD = new FormData();
        formD.append('idDetalle', item.node.data.id);

        this.acuerdoservicioService.quitarDetalleBeneficio(formD).subscribe(
          (res: any) => {
            this.toastrService.success(
              'Correcto!',
              'Detalle de beneficio eliminado correctamente.'
            );
          },
          (error: any) => {
            this.loadingService.hideLoading();
            this.toastrService.error('ERROR', 'Error al eliminar el detalle!');
          }
        );

        this.lstBeneficios = [...this.lstBeneficios];
      }
    });
  }
    eliminarNodoVA(item: any) {

    Swal.fire({
      title: '¿Está seguro?',
      text: 'Esta acción eliminará el detalle de Valor agregado.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    }).then((result) => {

      if (result.isConfirmed) {

        this.lstValoresAgregados.forEach(padre => {
          const index = padre.children.findIndex(
            (hijo: any) => hijo.data.id == item.node.data.id
          );
          if (index !== -1) {
            padre.children.splice(index, 1);
          }
        });

        let formD = new FormData();
        formD.append('idDetalle', item.node.data.id);

        this.acuerdoservicioService.quitarDetalleValorAgregado(formD).subscribe(
          (res: any) => {
            this.toastrService.success(
              'Correcto!',
              'Detalle de valor agregado eliminado correctamente.'
            );
          },
          (error: any) => {
            this.loadingService.hideLoading();
            this.toastrService.error('ERROR', 'Error al eliminar el detalle!');
          }
        );

        this.lstValoresAgregados = [...this.lstValoresAgregados];
      }
    });
  }
  abrirModalBeneficio(esEdicion: boolean) {
    this.isEditingBeneficio = esEdicion;
    $('#beneficioModal').modal('show');
  }
  abrirModalValorAgregado(esEdicion: boolean) {
    this.isEditingValorAgregado = esEdicion;
    $('#valorAgregadoModal').modal('show');
  }
  guardarBeneficio() {
    if (this.isEditingBeneficio) {
      //this.actualizarBeneficio();
    } else {
      this.crearBeneficio();
    }
  }
  guardarValorAgregado(){
        if (this.isEditingValorAgregado) {
      //this.actualizarBeneficio();
    } else {
      this.crearValorAgregado();
    }
  }
  async crearBeneficio() {
    try {


      if (this.beneficioForm.valid) {
        const padre = this.beneficioSelect;
        const puedeContinuar = await this.validarMonto(padre, this.beneficioForm.value.valorBeneficio);

        if (!puedeContinuar) {
          return; // ❌ se detiene si cancela
        }
        this.loadingService.showLoading();
        //guardar el detalle de beneficio
        let formD = new FormData();
        formD.append('idBeneficio', this.beneficioSelect?.data?.id);
        formD.append('nombreBeneficio', this.beneficioForm.value.nombreBeneficio);
        formD.append('detalleBeneficio', this.beneficioForm.value.detalleBeneficio);
        formD.append('cantidadBeneficio', this.beneficioForm.value.cantidadBeneficio);
        formD.append('valorBeneficio', this.beneficioForm.value.valorBeneficio);
        formD.append('fechaCumplimiento', this.beneficioForm.value.fechaCumplimiento);
        this.acuerdoservicioService.agregarDetalleAcuerdo(formD).subscribe((res: any) => {
          const nuevoHijo = {
            data: {
              id: res.data,
              modificado: '',
              idBeneficio: this.beneficioSelect?.data?.id,
              nombreBeneficio: this.beneficioForm.value.nombreBeneficio,
              detalleBeneficio: this.beneficioForm.value.detalleBeneficio,
              cantidadBeneficio: this.beneficioForm.value.cantidadBeneficio,
              valorBeneficio: this.beneficioForm.value.valorBeneficio,
              fechaCumplimiento: this.beneficioForm.value.fechaCumplimiento,
            }
          };

          if (!this.beneficioSelect.children) {
            this.beneficioSelect.children = [];
          }

          this.beneficioSelect.children.push(nuevoHijo);
          this.beneficioSelect.leaf = false;
          // 🔥 refrescar
          this.lstBeneficios = [...this.lstBeneficios];

          this.beneficioForm.reset();

          this.cerrarModalBeneficio();

          this.toastrService.success(
            'Correcto!',
            'Beneficio agregado correctamente.'
          );
        }, (error: any) => {
          this.loadingService.hideLoading();
          this.toastrService.error('ERROR', 'No se pudo guardar los registros!');
        });


      } else {
        this.toastrService.error(
          'Error al agregar',
          'No se llenaron todos los campos necesarios.'
        );
      }

    } catch (error) {
      if (error instanceof Error) {
        this.toastrService.error('Error', error.message);
      } else {
        this.toastrService.error(
          'Error',
          'Solicitar soporte al departamento de TI.'
        );
      }
    } finally {
      this.loadingService.hideLoading();
    }
  }
    async crearValorAgregado() {
    try {


      if (this.valorAgregadoForm.valid) {
        this.loadingService.showLoading();
        //guardar el detalle de beneficio
        let formD = new FormData();
        formD.append('idValor', this.valorAgregadoSelect?.data?.id);
        formD.append('nombreValor', this.valorAgregadoForm.value.nombreValor);
        formD.append('detalleValor', this.valorAgregadoForm.value.detalleValor);
        formD.append('cantidadValor', this.valorAgregadoForm.value.cantidadValor);
        formD.append('valor', this.valorAgregadoForm.value.valor);
        formD.append('fechaCumplimiento', this.valorAgregadoForm.value.fechaCumplimiento);
        this.acuerdoservicioService.agregarDetalleAcuerdoVA(formD).subscribe((res: any) => {
          const nuevoHijo = {
            data: {
              id: res.data,
              modificado: '',
              idValor: this.valorAgregadoSelect?.data?.id,
              nombreValor: this.valorAgregadoForm.value.nombreValor,
              detalleValor: this.valorAgregadoForm.value.detalleValor,
              cantidadValor: this.valorAgregadoForm.value.cantidadValor,
              valor: this.valorAgregadoForm.value.valor,
              fechaCumplimiento: this.valorAgregadoForm.value.fechaCumplimiento,
            }
          };

          if (!this.valorAgregadoSelect.children) {
            this.valorAgregadoSelect.children = [];
          }

          this.valorAgregadoSelect.children.push(nuevoHijo);
          this.valorAgregadoSelect.leaf = false;
          // 🔥 refrescar
          this.lstValoresAgregados = [...this.lstValoresAgregados];

          this.valorAgregadoForm.reset();

          this.cerrarModalValorAgregado();

          this.toastrService.success(
            'Correcto!',
            'Valor Agregado guardado correctamente.'
          );
        }, (error: any) => {
          this.loadingService.hideLoading();
          this.toastrService.error('ERROR', 'No se pudo guardar los registros!');
        });


      } else {
        this.toastrService.error(
          'Error al agregar',
          'No se llenaron todos los campos necesarios.'
        );
      }

    } catch (error) {
      if (error instanceof Error) {
        this.toastrService.error('Error', error.message);
      } else {
        this.toastrService.error(
          'Error',
          'Solicitar soporte al departamento de TI.'
        );
      }
    } finally {
      this.loadingService.hideLoading();
    }
  }
  cerrarModalBeneficio() {
    $('#beneficioModal').modal('hide');
  }
    cerrarModalValorAgregado() {
    $('#valorAgregadoModal').modal('hide');
  }
  obtenerTodosLosHijos(nodos: any[]): any[] {
    let resultado: any[] = [];

    nodos.forEach(nodo => {

      if (nodo.children && nodo.children.length > 0) {

        nodo.children.forEach((hijo: any) => {

          // ✅ agregar directamente el data
          resultado.push(hijo.data);

          // 🔁 seguir bajando niveles
          resultado.push(...this.obtenerTodosLosHijos([hijo]));

        });

      }

    });

    return resultado;
  }
  getTotales(padre: any) {
    let totalCantidad = 0;
    let totalValor = 0;

    if (!padre || !padre.children) return { cantidad: 0, valor: 0 };

    padre.children.forEach((hijo: any) => {
      totalCantidad += Number(hijo.data?.cantidadBeneficio || 0);
      totalValor += Number(hijo.data?.valorBeneficio || 0);
    });

    return {
      cantidad: totalCantidad,
      valor: totalValor
    };
  }
  esUltimoHijo(rowNode: any): boolean {
    if (!rowNode || !rowNode.node || !rowNode.node.parent) return false;

    const hermanos = rowNode.node.parent.children;
    return hermanos[hermanos.length - 1] === rowNode.node;
  }
  getPadre(rowNode: any) {
    return rowNode?.node?.parent;
  }
  getTotalHijos(padre: any): number {
    let total = 0;

    padre.children?.forEach((hijo: any) => {
      total += Number(hijo.data?.valorBeneficio || 0);
    });

    return total;
  }
  async validarMonto(padre: any, nuevoValor: number): Promise<boolean> {

    const totalActual = this.getTotalHijos(padre);
    const totalConNuevo = totalActual + Number(nuevoValor || 0);
    const limitePadre = Number(padre.data?.valorBeneficio || 0);

    if (totalConNuevo > limitePadre) {

      const result = await Swal.fire({
        icon: 'warning',
        title: 'Valor excedido',
        text: 'La suma de los beneficios del detalle va a superar el valor ofrecido. ¿Desea continuar?',
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33'
      });

      return result.isConfirmed; // ✅ true si acepta, false si cancela
    }

    return true;
  }
}