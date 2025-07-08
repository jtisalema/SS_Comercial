import { Injectable } from '@angular/core';

declare function toastr_success(title: string, message: string): any;
declare function toastr_info(title: string, message: string): any;
declare function toastr_error(title: string, message: string): any;
declare function toastr_warning(title: string, message: string): any;

@Injectable({
  providedIn: 'root'
})
export class ToastrService {

  success(title: string, message: string) {
    toastr_success(title, message);
  }

  info(title: string, message: string) {
    toastr_info(title, message);
  }

  error(title: string, message: string) {
    toastr_error(title, message);
  }

  warning(title: string, message: string) {
    toastr_warning(title, message);
  }

}
