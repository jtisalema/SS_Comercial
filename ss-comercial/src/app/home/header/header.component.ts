import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'nav[app-header]',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  currentUserPhoto: string = "";
  nombreUsuario: string = "";
  cargoUsuario: string = "";
  ultimoInicioSesion: string = "";
  userCurrent:any;
  constructor(private router: Router,
    private authService:AuthService
  ) { }

  async ngOnInit() {
    this.userCurrent = await this.authService.getUserInfor();
    console.log('autservice',this.userCurrent);
    this.nombreUsuario = this.userCurrent.get_persona?.nombre+" "+this.userCurrent.get_persona?.apellido;
    this.cargoUsuario = this.userCurrent.get_cargo?.cargo;
  }

  cerrarSesion() {
    localStorage.removeItem('Access-Token');
    this.router.navigate(['/'])
  }


}
