import { bootstrapApplication } from '@angular/platform-browser';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [provideIonicAngular()]
}).catch((err) => console.error(err));
