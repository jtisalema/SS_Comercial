import { Component } from '@angular/core';

@Component({
  selector: 'app-noticias',
  templateUrl: './noticias.component.html',
  styleUrls: ['./noticias.component.css']
})
export class NoticiasComponent {
  imagenes = [
    { url: 'assets/image/fondo1.png', tipo: 'fullscreen' },
    { url: 'assets/image/detacado1.jpeg', tipo: 'medio' },
    { url: 'assets/image/fondo2.png', tipo: 'fullscreen' },
    { url: 'assets/image/fondo3.png', tipo: 'fullscreen' }
  ];
efectos = [
  'fade',
  'zoom',
  'slide-left',
  'slide-right',
  'rotate',
  'blur',
  'granulado',
  'pixelado',
  'desenfoque-horizontal',
  'desenfoque-vertical',
  'escala-baja',
  'parpadeo',
  'brillo',
];

  efectoActual = 'fade';
  animacionId = 0;

  indiceActual = 0;
  intervalo: any;

  ngOnInit() {
    this.iniciarCarrusel();
  }

  iniciarCarrusel() {
    this.intervalo = setInterval(() => {
      this.cambiarImagen();
    }, 4000);
  }

  cambiarImagen() {
    this.efectoActual = this.obtenerEfectoAleatorio();
    this.indiceActual = (this.indiceActual + 1) % this.imagenes.length;
    this.animacionId++; // fuerza cambio de clase
  }

  obtenerEfectoAleatorio(): string {
    const aleatorio = Math.floor(Math.random() * this.efectos.length);
    return this.efectos[aleatorio];
  }

  ngOnDestroy() {
    clearInterval(this.intervalo);
  }

  getClaseAnimacion(): string {
    return `${this.efectoActual}-${this.animacionId}`;
  }

  get imagenActual() {
    return this.imagenes[this.indiceActual];
  }
  toggleFullscreen() {
  const elem = document.documentElement;

  if (!document.fullscreenElement) {
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen(); // Safari
    } else if ((elem as any).msRequestFullscreen) {
      (elem as any).msRequestFullscreen(); // IE/Edge
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen(); // Safari
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen(); // IE/Edge
    }
  }
}

}


