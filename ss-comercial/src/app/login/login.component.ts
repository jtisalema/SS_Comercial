import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from '../services/toastr.service';
import { AppComponent } from '../app.component';
import { environment } from 'src/environments/environment';
// import { AutenticacionActivoService } from '../services/autenticacion-activo.service';
// import { IActualizacionContrasenia, IInicioSesionActivo } from '../models/inicio-sesion-activo';
import Swal from 'sweetalert2';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  loginForm: FormGroup = new FormGroup({});
  model: any = {};
  appName: any;
  copyright: any;
  identificadorUnico: string = '';

  constructor(private fb: FormBuilder,
    private toastrService: ToastrService,
    private appComponent: AppComponent,
    private authService: AuthService) { }

  ngOnInit() {
    this.CreateLoginForm();
    const body = document.getElementsByTagName('body')[0];
    body.classList.add('login-page');
    this.appName = environment.projectName;
    this.copyright = environment.copyrightLogin;

  }

  CreateLoginForm() {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  async iniciarSesion() {
    console.log(this.loginForm.value.username);
    console.log(this.loginForm.value.password);
    let swalInstance: any;

    try {
      if (this.loginForm.valid) {
        swalInstance = Swal.fire({
          title: 'Verificando credenciales...',
          text: 'Por favor, espere mientras se procesa la solicitud.',
          icon: 'info',
          showConfirmButton: false,
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        //
        const response = await this.authService.login(this.loginForm.value.username, this.loginForm.value.password);
        if (response.access_token) {
          const token = response.access_token;
          this.authService.setToken(token);
        }
        window.location.href = 'personal';
        console.log('response', response);
        //
      } else {
        //this.appComponent.validateAllFormFields(this.loginForm);
        this.toastrService.error('Error al iniciar sesión', 'No se llenaron todos los campos necesarios.');
      }
    } catch (error) {
      if (error instanceof Error) {
        this.toastrService.error('Error al iniciar sesión', error.message);
      } else {
        this.toastrService.error('Error al iniciar sesión', 'Solicitar soporte al departamento de TI.');
      }
    } finally {
      if (swalInstance) {
        swalInstance.close();
      }
    }
  }

}