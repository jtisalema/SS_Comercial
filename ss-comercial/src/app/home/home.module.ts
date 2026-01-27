import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { InicioComponent } from './inicio/inicio.component';
import { HeaderComponent } from './header/header.component';
import { PersonalComponent } from './personal/personal.component';
import { PresupuestoComponent } from './presupuesto/presupuesto.component';
import { ComunicadosComponent } from './comunicados/comunicados.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ChlingresoComponent } from './chlingreso/chlingreso.component';
import { NgSelectModule } from '@ng-select/ng-select';

@NgModule({
  declarations: [
    HomeComponent,
    SidebarComponent,
    InicioComponent,
    HeaderComponent,
    PersonalComponent,
    PresupuestoComponent,
    ComunicadosComponent,
    ChlingresoComponent
  ],
  imports: [
    CommonModule,
    HomeRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule
  ]
})
export class HomeModule { }
