import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ToastrService } from 'src/app/services/toastr.service';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authServices: AuthService,private router: Router,private toastrService:ToastrService) {}

  canActivate(route: any): boolean {
    const authenticated = this.authServices.getToken();
    let res =  this.authServices.getUserInfor().then((data) => {
      console.log('data',data);
    });
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const rol = user?.idRol;

    const rolesPermitidos = route.data?.roles as Array<number>;

    if (rolesPermitidos.includes(rol)) {
      return true;
    }

    // ❌ redirige si no tiene permiso
    this.toastrService.error('ERROR','No tiene permisos para acceder a este módulo');
    localStorage.clear();
    this.router.navigate(['/']);
    return false;
  }
}