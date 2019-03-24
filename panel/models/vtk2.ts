import * as p from "core/properties"
import {HTMLBox, HTMLBoxView} from "models/layouts/html_box"


const WRAPPED_ID_RE = /instance:\${([^}]+)}/
const WRAP_ID = (id: string) => `instance:$\{${id}}`

export class VTKPlotView2 extends HTMLBoxView {
  model: VTKPlot2
  protected _vtk: any
  protected _rendererEl: any
  protected _container: HTMLDivElement
  protected _vtk_initialized: boolean
  protected _type_handlers: any = {}
  protected _skipped_instances_ids: any = []
  protected _exclude_instance_map: any = {}
  protected _context: any = {}

  initialize(): void {
    super.initialize()
    this._vtk = (window as any).vtk
    const sync = this._vtk.Rendering.Misc.vtkSynchronizableRenderWindow.newInstance({
        
    })
    debugger
    sync.synchronize(this.model.state)
  }

  _vtkExtractInstanceIds(argList: any[]) {
    return argList
      .map((arg) => WRAPPED_ID_RE.exec(arg))
      .filter((m) => m)
      .map((m) => m![1]);
  }

  _vtkExtractDependencyIds(state: any, depList: any[] = []) {
    if (state.dependencies) {
      state.dependencies.forEach((childState: any) => {
      depList.push(childState.id);
      this._vtkExtractDependencyIds(childState, depList)
      });
    }
    return depList
  }

  _vtkExcludeInstance(type: any, propertyName: any, propertyValue: any) {
    this._exclude_instance_map[type] = {
    key: propertyName,
    value: propertyValue,
    };
  }

  _setTypeMapping(type: any, build: Function, update: Function) {
    if (!build && !update) {
      delete this._type_handlers[type]
      return
    }
    this._type_handlers[type] = { build, update }
  }

  _vtkUpdate(type: any, instance: any, props: any) {
    if (!instance) {
      return;
    }
    const handler = this._type_handlers[type]
    if (handler && handler.update) {
      handler.update(instance, props)
    } else {
      console.log('no updater for', type)
    }
  }

  _vtkBuild(type: any, initialProps = {}) {
    const handler = this._type_handlers[type]
  
    if (handler && handler.build) {
      return handler.build(initialProps)
    }
  
    console.log('No builder for', type)
    return null;
  }

  _vtkGetSupportedTypes() {
    return Object.keys(this._type_handlers)
  }
  
  _vtkClearTypeMapping() {
    Object.keys(this._type_handlers).forEach((key) => {
      delete this._type_handlers[key]
    });
  }
  
  _vtkUpdateRenderWindow(instance: any, props: any) {
    return this._vtkUpdate('vtkRenderWindow', instance, props)
  }
  
  _vtkNotSkippedInstance(call: any) {
    if (call[1].length === 1) {
      return this._skipped_instances_ids.indexOf(call[1][0]) === -1;
    }
    let keep = false;
    for (let i = 0; i < call[1]; i++) {
      keep = keep || this._skipped_instances_ids.indexOf(call[1][i]) === -1;
    }
    return keep;
  }

  // ----------------------------------------------------------------------------
// Updater functions
// ----------------------------------------------------------------------------

 _vtkGenericUpdater(instance: any, state: any) {
  
  // First update our own properties
  instance.set(state.properties);

  // Now handle dependencies
  if (state.dependencies) {
    state.dependencies.forEach((childState: any) => {
      const { id, type } = childState;

      if (this._exclude_instance_map[type]) {
        const { key, value } = this._exclude_instance_map[type]
        if (!key || childState.properties[key] === value) {
          this._skipped_instances_ids.push(WRAP_ID(id));
          return
        }
      }

      const childInstance = this._vtkBuild(type, { managedInstanceId: id });
      update(type, childInstance, childState);
    });
  }

  if (state.calls) {
    state.calls
      .filter(notSkippedInstance)
      .forEach((call) =>
        instance[call[0]].apply(null, extractCallArgs(context, call[1]))
      );
  }

  context.end();
}


}

export namespace VTKPlot2 {
  export type Attrs = p.AttrsOf<Props>
  export type Props = HTMLBox.Props & {
    state: p.Property<any>
    data: p.Property<any>
  }
}

export interface VTKPlot2 extends VTKPlot2.Attrs {}

export class VTKPlot2 extends HTMLBox {
  properties: VTKPlot2.Props

  constructor(attrs?: Partial<VTKPlot2.Attrs>) {
    super(attrs)
  }

  static initClass(): void {
    this.prototype.type = "VTKPlot2"
    this.prototype.default_view = VTKPlotView2

    this.define<VTKPlot2.Props>({
      state: [p.Any ],
      data:  [p.Any ],
    })
  }
}
VTKPlot2.initClass()
