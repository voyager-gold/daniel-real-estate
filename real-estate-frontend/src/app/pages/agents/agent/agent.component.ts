import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatPaginator } from '@angular/material';
import { MediaChange, MediaObserver } from '@angular/flex-layout';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PerfectScrollbarConfigInterface } from 'ngx-perfect-scrollbar';
import { Subscription } from 'rxjs'; 
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AppService } from 'src/app/app.service'; 
import { Settings, AppSettings } from 'src/app/app.settings'; 
import { Agent, Property, Pagination } from 'src/app/app.models'; 
import { emailValidator } from 'src/app/theme/utils/app-validators';
import { MapMarker, MapInfoWindow, GoogleMap } from '@angular/google-maps';

@Component({
  selector: 'app-agent',
  templateUrl: './agent.component.html',
  styleUrls: ['./agent.component.scss']
})
export class AgentComponent implements OnInit {
  private sub: any;
  public agent: Agent;
  public agentId: any;
  @ViewChild('sidenav', { static: true }) sidenav: any;
  public sidenavOpen:boolean = true;
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;

  @ViewChild(GoogleMap, { static: false }) map: GoogleMap
  @ViewChild(MapInfoWindow, { static: false }) info: MapInfoWindow

  public psConfig: PerfectScrollbarConfigInterface = {
    wheelPropagation:true
  };
  public properties: Property[];
  public viewType: string = 'grid';
  public viewCol: number = 33.3;
  public count: number = 12;
  public sort: string;
  public searchFields: any;
  public removedSearchField: string;
  public pagination:Pagination = new Pagination(1, this.count, null, 2, 0, 0); 
  public message:string;
  public watcher: Subscription;
  public settings: Settings
  public contactForm: FormGroup;

  public zoom = 10;
  public center: google.maps.LatLng;
  public markers: Array<any> = [];
  public options: google.maps.MapOptions = {
    // mapTypeId: google.maps.MapTypeId.HYBRID,
    // zoomControl: false,
    // scrollwheel: false,
    // disableDoubleClickZoom: true,
    center: this.center,
    zoom: this.zoom,
    maxZoom: 15,
    minZoom: 8,
  };
  public infoContent: any;

  constructor(public appSettings:AppSettings, 
              public appService:AppService, 
              private activatedRoute: ActivatedRoute, 
              public mediaObserver: MediaObserver,
              public fb: FormBuilder) {
    this.settings = this.appSettings.settings;    
    this.watcher = mediaObserver.media$.subscribe((change: MediaChange) => { 
      if (change.mqAlias == 'xs') {
        this.sidenavOpen = false;
        this.viewCol = 100;
      }
      else if(change.mqAlias == 'sm'){
        this.sidenavOpen = false;
        this.viewCol = 50;
      }
      else if(change.mqAlias == 'md'){
        this.viewCol = 50;
        this.sidenavOpen = true;
      }
      else{
        this.viewCol = 33.3;
        this.sidenavOpen = true;
      }
    });
  }

  ngOnInit() {
    this.sub = this.activatedRoute.params.subscribe(params => { 
      
      this.agentId = params['id'];
      this.getAgentById(this.agentId);
      this.getProperties();
    });

    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', Validators.compose([Validators.required, emailValidator])],
      phone: ['', Validators.required],
      message: ['', Validators.required]
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.watcher.unsubscribe();
  } 

  public getAgentById(id){
    this.appService.getAgentById(id).subscribe(data => {
      this.agent = data;
    });
  }
   

  public getProperties(){   
    this.appService.getPropertiesByAgentId(this.agentId).subscribe(data => { 
      let result = this.filterData(data); 
      if(result.data.length == 0){
        this.properties.length = 0;
        this.pagination = new Pagination(1, this.count, null, 2, 0, 0);  
        this.message = 'No Results Found';
        return false;
      } 
      this.properties = result.data; 
      this.pagination = result.pagination;
      this.message = null;

      this.markers = [];
      this.properties.forEach((property) => {
        this.markers.push({
          id: property.id,
          position: new google.maps.LatLng(property.details.lat, property.details.lng),
          label: {
            color: 'black',
            text: property.title
          },
          info: property,
          options: {
            icon: {
              url: '/assets/images/markers/red.png',
              labelOrigin: new google.maps.Point(0, 24)
            }
          }
        });
        this.center = new google.maps.LatLng(property.details.lat, property.details.lng);
      })
    });
  }

  public resetPagination(){ 
    if(this.paginator){
      this.paginator.pageIndex = 0;
    }
    this.pagination = new Pagination(1, this.count, null, null, this.pagination.total, this.pagination.totalPages);
  }

  public filterData(data){
    return this.appService.filterData(data, this.searchFields, this.sort, this.pagination.page, this.pagination.perPage);
  }

  public searchClicked(){ 
    this.properties.length = 0;
    this.getProperties(); 
    window.scrollTo(0,0);  
  }
  public searchChanged(event){
    event.valueChanges.subscribe(() => {   
      this.resetPagination(); 
      this.searchFields = event.value;
      setTimeout(() => {      
        this.removedSearchField = null;
      });
      if(!this.settings.searchOnBtnClick){     
        this.properties.length = 0;  
      }            
    }); 
    event.valueChanges.pipe(debounceTime(500), distinctUntilChanged()).subscribe(() => { 
      if(!this.settings.searchOnBtnClick){     
        this.getProperties(); 
      }
    });       
  } 
  public removeSearchField(field){ 
    this.message = null;   
    this.removedSearchField = field; 
  } 


  public changeCount(count){
    this.count = count;   
    this.properties.length = 0;
    this.resetPagination();
    this.getProperties();
  }
  public changeSorting(sort){    
    this.sort = sort; 
    this.properties.length = 0;
    this.getProperties();
  }
  public changeViewType(obj){ 
    this.viewType = obj.viewType;
    this.viewCol = obj.viewCol; 
  } 


  public onPageChange(e){ 
    this.pagination.page = e.pageIndex + 1;
    this.getProperties();
    window.scrollTo(0,0);  
  }

  public onContactFormSubmit(values:Object){
    if (this.contactForm.valid) { 
      console.log(values);
    } 
  }

  public openInfo(marker: MapMarker, content) {
    this.infoContent = content;
    this.info.open(marker);
  }

}