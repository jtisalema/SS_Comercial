import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pagina-no-encontrada',
  templateUrl: './pagina-no-encontrada.component.html',
  styleUrls: ['./pagina-no-encontrada.component.css']
})
export class PaginaNoEncontradaComponent {
    constructor(private router: Router
    ) { }
async ngOnInit() {
setTimeout(() => {
      // localStorage.removeItem('Access-Token');
    this.router.navigate(['/'])
}, 1000);
}
}
