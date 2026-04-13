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
import { NgxDropzoneModule } from 'ngx-dropzone';
import { ChlseguimientoComponent } from './chlseguimiento/chlseguimiento.component';
import { PygingresoComponent } from './pygingreso/pygingreso.component';
import { PygingresoComponent2 } from './pygingreso2/pygingreso2.component';
import { AcuerdoservicioComponent } from './acuerdoservicio/acuerdoservicio.component';
import { AcuerdoseguimientoComponent } from './acuerdoseguimiento/acuerdoseguimiento.component';
import { ReqasegIngresoComponent } from './reqaseg-ingreso/reqaseg-ingreso.component';
import { ReqasegSeguimientoComponent } from './reqaseg-seguimiento/reqaseg-seguimiento.component';
import { AcuerdosegbeneficioComponent } from './acuerdosegbeneficio/acuerdosegbeneficio.component';
import { TreeTableModule } from 'primeng/treetable';

@NgModule({
  declarations: [
    HomeComponent,
    SidebarComponent,
    InicioComponent,
    HeaderComponent,
    PersonalComponent,
    PresupuestoComponent,
    ComunicadosComponent,
    ChlingresoComponent,
    ChlseguimientoComponent,
    PygingresoComponent,
    PygingresoComponent2,
    AcuerdoservicioComponent,
    AcuerdoseguimientoComponent,
    ReqasegIngresoComponent,
    ReqasegSeguimientoComponent,
    AcuerdosegbeneficioComponent
  ],
  imports: [
    CommonModule,
    HomeRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule,
    NgxDropzoneModule,
    TreeTableModule
  ]
})
export class HomeModule { }
