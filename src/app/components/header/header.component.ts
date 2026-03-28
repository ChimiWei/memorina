import { Component, HostListener, signal, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
 
interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}
 
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
   constructor(private el: ElementRef) {}

  private updateHeight() {
    const header = this.el.nativeElement.querySelector('header');
    if (header) {
      const height = header.offsetHeight;
      document.documentElement.style.setProperty('--header-height', `${height}px`);
    }
  }

  ngAfterViewInit() {
    this.updateHeight();
  }

  @HostListener('window:resize')
  onResize() {
    this.updateHeight();
  }


  isScrolled = signal(false);
  isMobileMenuOpen = signal(false);
  activeDropdown = signal<string | null>(null);
 
  navItems: NavItem[] = [
    // {
    //   label: 'Produto',
    //   href: '#',
    //   children: [
    //     { label: 'Visão Geral', href: '#' },
    //     { label: 'Funcionalidades', href: '#' },
    //     { label: 'Integrações', href: '#' },
    //     { label: 'Changelog', href: '#' },
    //   ],
    // },
    // {
    //   label: 'Soluções',
    //   href: '#',
    //   children: [
    //     { label: 'Para Startups', href: '#' },
    //     { label: 'Para Empresas', href: '#' },
    //     { label: 'Para Agências', href: '#' },
    //   ],
    // },
    // { label: 'Preços', href: '#' },
    // { label: 'Blog', href: '#' },
    // { label: 'Docs', href: '#' },
  ];
 
  @HostListener('window:scroll')
  onScroll() {
    this.isScrolled.set(window.scrollY > 20);
  }
 
  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }
 
  toggleDropdown(label: string) {
    this.activeDropdown.update(current => (current === label ? null : label));
  }
 
  closeDropdown() {
    this.activeDropdown.set(null);
  }
}