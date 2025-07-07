import { Component, ElementRef, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-home',
  host: { 'class': 'wrapper' },
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  copyright: any;

  constructor(private renderer: Renderer2, private el: ElementRef) { }


  ngOnInit() {
    this.copyright = 'environment.copyright';
    const body = this.el.nativeElement.ownerDocument.body;
  }
  SetActive(targetElement: HTMLElement) {
    this.SetInactive();
    this.AddClass(targetElement);
  }

  SetInactive() {
    const menu = document.getElementsByName('mainParent')[0];
    const allMenuOpenTag = menu.getElementsByClassName('menu-open') as HTMLCollectionOf<Element>;
    for (let i = 0; i < allMenuOpenTag.length; i--) {
      const temp = allMenuOpenTag[i] as HTMLElement;
      this.RemoveClass(temp);
      i++;
    }
  }

  private RemoveClass(menuOpenTag: HTMLElement) {
    (menuOpenTag.childNodes[0] as HTMLElement).classList.remove('active');
    (menuOpenTag.childNodes[1] as HTMLElement).style.display = 'none';
    menuOpenTag.classList.remove('menu-open');

  }

  public AddClass(target: HTMLElement) {
    const parent = target.parentElement!.parentElement;
    const parentNameAttr = parent!.attributes.getNamedItem('name');
    const parentName = parentNameAttr ? parentNameAttr.nodeValue : null;

    if (parentName === 'childParent') {
      const parentLi = parent!.parentElement;
      parentLi!.classList.add('menu-open');
      (parentLi!.childNodes[1] as HTMLElement).style.display = 'block';
      (parentLi!.childNodes[0] as HTMLElement).classList.add('active');
      this.AddClass(parent!);
    }
  }
}
