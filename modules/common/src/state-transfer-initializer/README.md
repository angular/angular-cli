# State Transfer Initializer

Delays the app bootstrap process to ensure that the DOM content is loaded before state transfer initilization

Simply import the module into your project and you will no longer need to wrap your component bootstrap function in an `DOMContentLoaded` callback

```
import { StateTransferInitializerModule } from '@nguniversal/common'

@NgModule({
  imports: [ StateTransferInitializerModule ]
})
export class AppModule{}
```
