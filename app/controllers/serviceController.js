	(function(){
	'use strict';
	
//SERVICE CONTROLLER ----------------------------------------------------------------------
	var ServiceController = function($scope, $uibModal, documentationFactory, $location, jobFactory){

		$scope.serviceTitle = "Generic OGC Client";
		
		$scope.availableLayers = [];
		$scope.availableProcesses = [];
		$scope.availableCatalogues = [];
		
		$scope.showFeatureLayers = false;
		$scope.showProcesses = false;
		
	
		$scope.availableOutputs = jobFactory.outputs;
		$scope.showOutputs = jobFactory.showOutputs;
		
		
		if(documentationFactory.apiDocumentation) {
			$scope.serviceTitle = documentationFactory
					.apiDocumentation['ows:serviceIdentification']["ows:title"];
			

			//Extract supportedClass array, and for every object element look for ows:name and @type featureLayer
			documentationFactory.apiDocumentation.supportedClass.forEach(function(item){
				//WFS layers
				if(item["@type"].indexOf("featureType") !=-1){
					$scope.availableLayers.push({name: item["ows:name"], url: item["@id"], outputFormats: item["ows:outputFormats"]});
				}
				//WPS processes
				if(item["@type"].indexOf("process") !=-1){
					$scope.availableProcesses.push(item["ows:name"]);
				}
				
				//CSW records - Saves URL of the catalogue
				if(item["@type"].indexOf("records") !=-1){
					$scope.availableCatalogues.push(item["@id"]);
				}
			});
			
			$scope.showFeatureLayers = $scope.availableLayers.length>0;
			$scope.showProcesses = $scope.availableProcesses.length>0;					
		} else {
			$location.path('');
		}
		

		$scope.openServiceMetadata = function () {
			var modalInstance = $uibModal.open({
				animation: true,
				templateUrl: 'app/views/serviceMetadata.html',
				controller: 'ServiceMetadataCtrl',
				size: 'lg',
				resolve: {
					apiDocumentation: function () {
						return documentationFactory.apiDocumentation;
					}
				}
			});
		};
		
		//Both for process and for feature layers
		$scope.openLayerMetadata = function (name) {
			var modalInstance = $uibModal.open({
				animation: true,
				templateUrl: 'app/views/layerMetadata.html',
				controller: 'LayerMetadataCtrl',
				size: 'lg',
				resolve: {
					layer: function () {
						return name;
					}
				}
			});
		};
		
		$scope.openLayerQuery = function(name){};
		
		
		$scope.createJob = function(processName){
			var modalInstance = $uibModal.open({
				animation: true,
				templateUrl: 'app/views/createJob.html',
				controller: 'CreateJobCtrl',
				size: 'lg',
				resolve: {
					layer: function () {
						return processName;
					}
				}
			});						
		};

		
		$scope.openOutputMetadata = function(name){};
		$scope.openOutputQuery = function(name){};

	};
	
	ServiceController.$inject = ['$scope', '$uibModal', 'documentationFactory', '$location', 'jobFactory'];
	
	angular.module('genericClientApp')
		.controller('ServiceController', ServiceController);


//SERVICE METADATA CONTROLLER ----------------------------------------------------------------------
	var ServiceMetadataCtrl = function ($scope, $uibModalInstance, apiDocumentation) {

		$scope.context = apiDocumentation['@context'];
		
		delete apiDocumentation['@context'];
		
		$scope.apiDocumentation = apiDocumentation;
		
		$scope.close = function () {
			$uibModalInstance.close();
		};
	};

	ServiceMetadataCtrl.$inject = ['$scope', '$uibModalInstance', 'apiDocumentation'];
	
	angular.module('genericClientApp')
		.controller('ServiceMetadataCtrl', ServiceMetadataCtrl);


//LAYER METADATA CONTROLLER ----------------------------------------------------------------------
	var LayerMetadataCtrl = function ($scope, $uibModalInstance, layer, documentationFactory, $q) {

		var layerDocumentation = documentationFactory.apiDocumentation.supportedClass.filter(function(item){
			if(item["ows:name"] === layer){
				return true;
			}
		})[0];
		$scope.name = layer;

		$scope.context = "";
		
		$scope.schema = "";
		
		$scope.metadata = layerDocumentation;
		
		$scope.errorMsgContext = null;
		$scope.errorMsgSchema = null;
		
		$scope.isLoadingContext = true;
		$scope.isLoadingSchema = true;
		
		//Returns a object: {context: url, schema: url} or an error
		documentationFactory.verifyHeadersDescribeLayers($scope.metadata["@id"])
			.then(function success(response){
				return $q.all([documentationFactory.verifyDescribeLayers(response.context),documentationFactory.verifyDescribeLayers(response.schema)]);
			})
			.then(function success(response){
				$scope.context = response[0];
				$scope.schema = response[1];
				$scope.isLoadingSchema = false;
				$scope.isLoadingContext = false;		
			}, function error(response){
				$scope.errorMsgSchema = response;
				$scope.errorMsgContext = response;
			});
		
		$scope.close = function () {
			$uibModalInstance.close();
		};
	};

	LayerMetadataCtrl.$inject = ['$scope', '$uibModalInstance', 'layer', 'documentationFactory', '$q'];
	
	angular.module('genericClientApp')
		.controller('LayerMetadataCtrl', LayerMetadataCtrl);

//CREATE JOB CONTROLLER ----------------------------------------------------------------------
	var CreateJobCtrl = function ($scope, $uibModalInstance, layer, documentationFactory, jobFactory) {
		
		var layerDocumentation = documentationFactory.apiDocumentation.supportedClass.filter(function(item){
			if(item["ows:name"] === layer){
				return true;
			}
		})[0];
		
		$scope.processUrl = {};
		$scope.processUrl.operation = layerDocumentation['@id'];
		
		$scope.input = "";
		
		$scope.errorMsg = null;
		
		$scope.jobs = jobFactory.jobs;
		
		$scope.inputs = [];
		
		var loadInputs = function(){
			layerDocumentation.supportedOperation[0].inputs.forEach(function(item){
				var input = {};
				input.name = item["ows:title"];
				if(item["ows:formats"].indexOf("text/plain") != -1){
					input.byReference = false;
					input.size = 1;
				} else {
					input.byReference = true;
					input.size = 10;
				}
				input.data = "";
				
				$scope.inputs.push(input);
			});
		};
		
		loadInputs();
		
		
		
		$scope.dismiss = function(job){

			jobFactory.deleteJob(job)
			.then(function success(response){
			}, function error(response){
				$scope.errorMsg = response;
			});	
		}
		
		$scope.refreshStatus = function(job){
			//Get job and update $scope.jobs
			jobFactory.updateJob(job)
			.then(function success(response){
			}, function error(response){
				$scope.errorMsg = response;
			});	
		}
		
		$scope.addOutputs = function(job){
			
			//FIXME using pre defined structure of documentation
			var outputsDoc = layerDocumentation.supportedOperation[0].outputs;

			jobFactory.addOutputs(job, outputsDoc)
			.then(function success(response){
				$uibModalInstance.close();
			}, function error(response){
				$scope.errorMsg = response;
			});		
		}		
		

		$scope.canRefresh = function(job){
			//Return true if Accepted Running
			//False if Succeeded Failed
			if(job.status === 'Accepted' || job.status === 'Running'){
				return true;
			}
			return false;
		}
		
		$scope.execute = function (name, data) {
			
			//build input
			var input = {};
			input.name = name;
			input.data = {};
			$scope.inputs.forEach(function(item){
				//only add if input has been filled (to remove optionals)
				if(item.data !== ""){
					if(item.byReference){
						input.data[item.name] = item.data;
					} else {
						input.data[item.name] = JSON.parse(item.data);
					}
					//clear form
					item.data = "";
				}
			});
			jobFactory.getJobs(layerDocumentation['@id'], input)
			.then(function success(response){
			}, function error(response){
				$scope.errorMsg = response;
			});		
		};		
		
		$scope.close = function () {
			$uibModalInstance.close();
		};
	};

	CreateJobCtrl.$inject = ['$scope', '$uibModalInstance', 'layer', 'documentationFactory', 'jobFactory'];
	
	angular.module('genericClientApp')
		.controller('CreateJobCtrl', CreateJobCtrl);

})();