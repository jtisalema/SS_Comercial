import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HomeComponent } from '../home.component';
import { environment } from 'src/environments/environment.prod';
import { AuthService } from 'src/app/services/auth.service';
import { Role } from 'src/app/helpers/role';
import { ToastrService } from 'src/app/services/toastr.service';

@Component({
  selector: 'aside[app-sidebar]',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
 appName = environment.projectName;
  constructor(private router: Router,private toastrService: ToastrService,
    private homeComponent: HomeComponent, private authService:AuthService) { }
    rolUsuario:any;
    userCurrent:any;
async ngOnInit() {
   this.userCurrent = await this.authService.getUserInfor();
  // Ejemplo: lo obtienes del localStorage o servicio
  this.rolUsuario = this.userCurrent?.idRol;
  //validar Rol de la plataforma
  const rolUsuario = this.userCurrent.get_roles.rol;

const tienePermiso = Object.values(Role).includes(rolUsuario);

if (tienePermiso) {
  // console.log('usuario Permitido');
} else {
  this.toastrService.error('ERROR', 'No tiene acceso a la plataforma!');

  localStorage.removeItem('Access-Token');
  this.router.navigate(['/'])
}
}

  ngAfterViewInit() {
    const menu = document.getElementById('mainParent');
    if (!menu) return; // evita el error
    const targets = menu.getElementsByTagName('a');
    for (let i = 0; i < targets.length; i++) {
      if (targets[i].pathname === this.router.url) {
        this.homeComponent.AddClass(targets[i] as HTMLElement);
        break;
      }
    }
  }

  public SetActive(event: MouseEvent) {
    let targetElement = event.target as HTMLElement;
    if (targetElement.nodeName !== 'A') {
      targetElement = targetElement.parentElement!;
    }
    this.homeComponent.SetActive(targetElement);
  }

}
