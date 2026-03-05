import { Component } from '@angular/core';
import { LoadingService } from 'src/app/services/loading.service';


@Component({
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  styleUrls: ['./loading.component.css']
})
export class LoadingComponent {

  loading: boolean = false;

  constructor(private loadingService: LoadingService) { }

  ngOnInit(): void {
    this.loadingService.loading$.subscribe((loading) => {
      this.loading = loading;
    });
  }

}
