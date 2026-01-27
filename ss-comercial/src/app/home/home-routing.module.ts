import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home.component';
import { InicioComponent } from './inicio/inicio.component';
import { PersonalComponent } from './personal/personal.component';
import { PresupuestoComponent } from './presupuesto/presupuesto.component';
import { ComunicadosComponent } from './comunicados/comunicados.component';
import { ChlingresoComponent } from './chlingreso/chlingreso.component';

const homeRoutes: Routes = [
  {
    path: '',
    component: HomeComponent,
    children: [{ path: 'inicio', component: InicioComponent },
      { path: 'personal', component: PersonalComponent },
      { path: 'presupuesto', component: PresupuestoComponent },
      { path: 'comunicados', component: ComunicadosComponent },
      { path: 'checkList/ingreso', component: ChlingresoComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(homeRoutes)],
  exports: [RouterModule]
})
export class HomeRoutingModule { }
