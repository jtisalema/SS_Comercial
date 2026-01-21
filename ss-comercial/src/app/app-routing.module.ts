import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NoticiasComponent } from './componentes/noticias/noticias.component';

const routes: Routes = [
  { path: "noticias", component: NoticiasComponent },
  { path: 'home', loadChildren: () => import('./home/home-routing.module').then(m => m.HomeRoutingModule), 
    //canActivate: [AuthGuard]
   },
  //{ path: "**", component: Page404Component }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
