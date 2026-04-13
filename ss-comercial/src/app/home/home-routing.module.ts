import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home.component';
import { InicioComponent } from './inicio/inicio.component';
import { PersonalComponent } from './personal/personal.component';
import { PresupuestoComponent } from './presupuesto/presupuesto.component';
import { ComunicadosComponent } from './comunicados/comunicados.component';
import { ChlingresoComponent } from './chlingreso/chlingreso.component';
import { ChlseguimientoComponent } from './chlseguimiento/chlseguimiento.component';
import { PygingresoComponent } from './pygingreso/pygingreso.component';
import { PygingresoComponent2 } from './pygingreso2/pygingreso2.component';
import { AcuerdoservicioComponent } from './acuerdoservicio/acuerdoservicio.component';
import { AuthGuard } from '../guard/auth-guard.guard';
import { Role } from 'src/app/helpers/role';
import { AcuerdoseguimientoComponent } from './acuerdoseguimiento/acuerdoseguimiento.component';
import { AcuerdosegbeneficioComponent } from './acuerdosegbeneficio/acuerdosegbeneficio.component';
import { FianzasComponent } from './fianzas/fianzas.component';

const homeRoutes: Routes = [
  {
    path: '',
    component: HomeComponent,
    children: [{ path: 'inicio', component: InicioComponent},
      { path: 'personal', component: PersonalComponent },
      { path: 'presupuesto', component: PresupuestoComponent },
      { path: 'comunicados', component: ComunicadosComponent },
      { path: 'checkList/ingreso', component: ChlingresoComponent},
      { path: 'checkList/ingreso/:id', component: ChlingresoComponent },
      { path: 'checkList/seguimiento', component: ChlseguimientoComponent,     
        //canActivate: [AuthGuard],data: { roles: [Role.Comercial] }  
      },
      { path: 'pyg/ingreso', component: PygingresoComponent },
      { path: 'pyg/ingreso2', component: PygingresoComponent2 },
      { path: 'pyg/seguimiento', component: ChlseguimientoComponent },
      { path: 'acserv/ingreso', component: AcuerdoservicioComponent },
      { path: 'acserv/ingreso/:id', component: AcuerdoservicioComponent },
      { path: 'acserv/seguimiento', component: AcuerdoseguimientoComponent },
      { path: 'acserv/seguimiento/beneficios/:id', component: AcuerdosegbeneficioComponent }
    children: [{ path: 'inicio', component: InicioComponent },
    { path: 'personal', component: PersonalComponent },
    { path: 'presupuesto', component: PresupuestoComponent },
    { path: 'comunicados', component: ComunicadosComponent },
    { path: 'checkList/ingreso', component: ChlingresoComponent },
    { path: 'checkList/ingreso/:id', component: ChlingresoComponent },
    {
      path: 'checkList/seguimiento', component: ChlseguimientoComponent,
      //canActivate: [AuthGuard],data: { roles: [Role.Comercial] }  
    },
    { path: 'pyg/ingreso', component: PygingresoComponent },
    { path: 'pyg/ingreso2', component: PygingresoComponent2 },
    { path: 'pyg/seguimiento', component: ChlseguimientoComponent },
    { path: 'acserv/ingreso', component: AcuerdoservicioComponent },
    { path: 'acserv/seguimiento', component: AcuerdoseguimientoComponent },
    { path: 'notificacion-fianzas', component: FianzasComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(homeRoutes)],
  exports: [RouterModule]
})
export class HomeRoutingModule { }
