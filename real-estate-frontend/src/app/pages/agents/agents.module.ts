import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AgentsComponent } from './agents.component';
import { AgentComponent } from './agent/agent.component'; 
import { GoogleMapsModule } from '@angular/google-maps';

export const routes = [
  { path: '', component: AgentsComponent, pathMatch: 'full' },
  { path: ':id', component: AgentComponent }
];

@NgModule({
  declarations: [
    AgentsComponent,
    AgentComponent    
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    SharedModule,
    GoogleMapsModule
  ]
})
export class AgentsModule { }
