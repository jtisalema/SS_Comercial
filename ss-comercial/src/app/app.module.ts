import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NoticiasComponent } from './componentes/noticias/noticias.component';
import { HomeModule } from './home/home.module';
import { PaginaNoEncontradaComponent } from './pagina-no-encontrada/pagina-no-encontrada.component';
import { HttpClientModule } from '@angular/common/http';
import { LoginComponent } from './login/login.component';
import { ReactiveFormsModule } from '@angular/forms';
import { LoadingComponent } from './home/loading/loading.component';

@NgModule({
  declarations: [
    AppComponent,
    NoticiasComponent,
    PaginaNoEncontradaComponent,
    LoginComponent,
    LoadingComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HomeModule,
    HttpClientModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
