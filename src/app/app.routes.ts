import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { UsersComponent } from './pages/users/users.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'users', component: UsersComponent },
  
  { path: 'chat', 
    loadComponent: () => import('./pages/chat/chat.component').then(m => m.ChatComponent)
   }
  ,
  { path: 'call',
    loadComponent: () => import('./pages/call/call.component').then(m => m.CallComponent)
  }

];

