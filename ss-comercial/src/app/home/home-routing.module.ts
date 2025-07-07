import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home.component';
import { InicioComponent } from './inicio/inicio.component';

const homeRoutes: Routes = [
  {
    path: '',
    component: HomeComponent,
    children: [{ path: 'inicio', component: InicioComponent },]
  }
];

@NgModule({
  imports: [RouterModule.forChild(homeRoutes)],
  exports: [RouterModule]
})
export class HomeRoutingModule { }
