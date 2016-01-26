# Getting started with Angular2 universal

In this getting started we'll create a basic Angular2 application and add server-side rendering 
to the project. 

# Setting the stage
# Adding support for server-side rendering

 - [Setting the stage](#sts)


## <a name="sts"></a> Setting the stage
In a traditional Angular2 application, the JavaScript modules are loaded to the client and 
the application get's bootstrapped in the browser. This process of bootstrapping the application
could take a reasonable amount of time, especially when your connection isn't great.

While dynamic loading and bootstrapping the Angular2 application takes place, the user is confronted 
with a blank page, or, like we are going to do, a message that states the application is loading. 

This getting started walks through the steps of enriching the application to include server-side rendering. 
After we've implemented the steps below, the server is serving a prerendered. 
