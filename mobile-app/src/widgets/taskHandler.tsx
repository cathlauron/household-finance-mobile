import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { loadWidgetSnapshot } from './snapshotStore';
import { widgetFor } from './FFWidgets';

// Runs when the phone asks a widget to draw itself (added, resized, every so often). Taps
// are links handled by the app (financeflow://voice, financeflow://add) or open the app.
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;
  const s = await loadWidgetSnapshot();
  props.renderWidget(widgetFor(props.widgetInfo.widgetName, s));
}
