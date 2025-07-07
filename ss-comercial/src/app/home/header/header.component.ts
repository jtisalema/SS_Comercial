import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'nav[app-header]',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  currentUserPhoto: string = "";
  nombreUsuario: string = "";
  ultimoInicioSesion: string = "";

  constructor(private router: Router) { }

  ngOnInit() {
    this.nombreUsuario = localStorage.getItem("nombreUsuario") ?? "Dixon Yombriel";
    this.ultimoInicioSesion = localStorage.getItem("lastLogin") ?? "2025-07-04";
  }

  cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('nombreUsuario');
    localStorage.removeItem('lastLogin');
    localStorage.removeItem('roles');
    localStorage.removeItem('userName');
    localStorage.removeItem('indicadoresFinancieros');
    localStorage.removeItem('actualizarContrasenia');
    this.router.navigate(['/'])
  }


}
