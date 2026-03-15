import { CommonModule, NgIf } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import {
  IonApp,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  RefresherCustomEvent,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { footstepsOutline, heartOutline, walkOutline, refreshOutline, phonePortraitOutline } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { Health } from '@capgo/capacitor-health';

interface HealthMetricCard {
  label: string;
  value: string;
  unit: string;
  icon: string;
  helper: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    IonApp,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonSpinner,
    IonText,
    IonRefresher,
    IonRefresherContent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly platform = Capacitor.getPlatform();
  readonly loading = signal(false);
  readonly ready = signal(false);
  readonly error = signal('');
  readonly lastUpdated = signal<string>('');

  readonly steps = signal<number | null>(null);
  readonly distanceMeters = signal<number | null>(null);
  readonly heartRateBpm = signal<number | null>(null);

  readonly cards = computed<HealthMetricCard[]>(() => [
    {
      label: 'Steps',
      value: this.formatInteger(this.steps()),
      unit: 'count',
      icon: 'footsteps-outline',
      helper: "Today's total from Apple Health / HealthKit."
    },
    {
      label: 'Distance',
      value: this.formatDistanceKm(this.distanceMeters()),
      unit: 'km',
      icon: 'walk-outline',
      helper: "Today's walking + running distance."
    },
    {
      label: 'Heart rate',
      value: this.formatInteger(this.heartRateBpm()),
      unit: 'bpm',
      icon: 'heart-outline',
      helper: 'Most recent heart-rate sample found in Health.'
    }
  ]);

  constructor(private readonly toastController: ToastController) {
    addIcons({
      footstepsOutline,
      heartOutline,
      walkOutline,
      refreshOutline,
      phonePortraitOutline
    });

    void this.initialize();
  }

  async initialize(): Promise<void> {
    if (this.platform === 'web') {
      this.error.set('Health data is only available on a real iPhone build. Run this app with Capacitor in Xcode.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      const availability = await Health.isAvailable();
      if (!availability.available) {
        this.error.set(availability.reason ?? 'Health access is not available on this device.');
        return;
      }

      await Health.requestAuthorization({
        read: ['steps', 'distance', 'heartRate']
      });

      await this.refreshMetrics();
      this.ready.set(true);
    } catch (error) {
      this.error.set(this.toMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(event?: RefresherCustomEvent): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      await this.refreshMetrics();
    } catch (error) {
      this.error.set(this.toMessage(error));
      const toast = await this.toastController.create({
        message: this.toMessage(error),
        duration: 2500,
        position: 'bottom'
      });
      await toast.present();
    } finally {
      this.loading.set(false);
      event?.target.complete();
    }
  }

  private async refreshMetrics(): Promise<void> {
    const start = this.startOfToday();
    const now = new Date().toISOString();

    const [stepsResult, distanceResult, hrResult] = await Promise.all([
      Health.queryAggregated({
        dataType: 'steps',
        startDate: start,
        endDate: now,
        bucket: 'day',
        aggregation: 'sum'
      }),
      Health.queryAggregated({
        dataType: 'distance',
        startDate: start,
        endDate: now,
        bucket: 'day',
        aggregation: 'sum'
      }),
      Health.readSamples({
        dataType: 'heartRate',
        startDate: start,
        endDate: now
      })
    ]);

    this.steps.set(this.sumSampleValues(stepsResult?.samples));
    this.distanceMeters.set(this.sumSampleValues(distanceResult?.samples));
    this.heartRateBpm.set(this.getMostRecentValue(hrResult?.samples));
    this.lastUpdated.set(new Date().toLocaleString());
  }

  private sumSampleValues(samples: Array<{ value?: number }> | undefined): number | null {
    if (!samples || samples.length === 0) return null;
    const total = samples.reduce((acc, sample) => acc + (sample.value ?? 0), 0);
    return Number.isFinite(total) ? total : null;
  }

  private getMostRecentValue(samples: Array<{ value?: number; endDate?: string; startDate?: string }> | undefined): number | null {
    if (!samples || samples.length === 0) return null;

    const sorted = [...samples].sort((a, b) => {
      const aTime = new Date(a.endDate ?? a.startDate ?? 0).getTime();
      const bTime = new Date(b.endDate ?? b.startDate ?? 0).getTime();
      return bTime - aTime;
    });

    return sorted[0]?.value ?? null;
  }

  private startOfToday(): string {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }

  private formatInteger(value: number | null): string {
    return value == null ? '--' : Math.round(value).toLocaleString();
  }

  private formatDistanceKm(value: number | null): string {
    if (value == null) return '--';
    return (value / 1000).toFixed(2);
  }

  private toMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return typeof error === 'string' ? error : 'Something went wrong while loading health data.';
  }
}
