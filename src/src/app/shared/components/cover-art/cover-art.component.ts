import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { mediaUrl } from '../../../core/utils/format.util';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-cover-art',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cover-box" [style.width.px]="size()" [style.height.px]="size()">
      @if (src()) {
        <img [src]="src()" [alt]="alt()" loading="lazy" />
      } @else {
        <app-icon name="album" [size]="size() * 0.48" />
      }
    </div>
  `,
  styles: [`
    .cover-box {
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: linear-gradient(135deg, rgba(20, 44, 55, 0.95), rgba(10, 22, 28, 0.95));
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      color: var(--text-muted);
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  `],
})
export class CoverArtComponent {
  readonly coverPath = input<string | null | undefined>(null);
  readonly alt = input<string>('Capa');
  readonly size = input<number>(44);
  readonly src = computed(() => mediaUrl(this.coverPath()));
}
