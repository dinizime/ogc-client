(function(){
	'use strict';
	
	//Interaction with Leaflet map and Json Visualization
	var ClassContentController = function($scope, $http, leafletData, documentationFactory, $uibModal) {

		$scope.layerDocumentation = "";

		//Data is stored in this variable
		$scope.layerData = "";

		//Where ther data is added
		$scope.layerGroup = null;
		
		//used to enable the Map tab for GeoJSON data
		$scope.mapTabActive = true;
		//Load spinner
		$scope.isLoadingData = false;
		
		//Switch between Map tab and JSON-LD tab
		$scope.mapTab = true;
		
		$scope.changeMapTab = function(){
			if($scope.mapTabActive){
				$scope.mapTab = !$scope.mapTab;
			}
		}
		
		$scope.activeLayer= "";
		//Open Form Modal
		$scope.openCreateFeature = function(feature, properties){
			var modalInstance = $uibModal.open({
				animation: true,
				templateUrl: 'app/views/createFeature.html',
				controller: 'CreateFeatureCtrl',
				size: 'lg',
				resolve: {
					feature: function () {
						return feature;
					},
					properties: function () {
						return properties;
					}
				}
			});
			
			return modalInstance.result;		
		};	
		
		//Open EditFeature Modal
		$scope.openEditFeature = function(feature, properties, canDelete, canPut){
			var modalInstance = $uibModal.open({
				animation: true,
				templateUrl: 'app/views/editFeature.html',
				controller: 'EditFeatureCtrl',
				size: 'lg',
				resolve: {
					feature: function () {
						return feature;
					},
					properties: function () {
						return properties;
					},
					canDelete: function () {
						return canDelete;
					},
					canPut: function () {
						return canPut;
					}
				}
			});
			
			return modalInstance.result;		
		};	


		//Leaflet
		angular.extend($scope, {
			world: {
				lat: 0,
				lng: 0,
				zoom: 4
			},
			layers: {
				baselayers: {
					osm: {
						name: 'OpenStreetMap',
						type: 'xyz',
						url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
						layerOptions: {
							subdomains: ['a', 'b', 'c'],
							attribution: '© OpenStreetMap contributors',
							continuousWorld: true
						}
					}
				}
			}
		});
		
		
		$scope.drawControl = '';
		
		var initDraw = function(){
			 
			leafletData.getMap().then(function(map) {
				
				$scope.layerGroup = new L.FeatureGroup();
				map.addLayer($scope.layerGroup);
				
				var options = {
					draw: {
						circle: false,
						rectangle: false,
						marker: false,
						polygon: false,
						polyline: false
					},
					edit: {
						featureGroup: $scope.layerGroup,
						edit: false,
						remove: false
					}
				}

				$scope.drawControl = new L.Control.Draw(options);
				map.addControl($scope.drawControl);
				
			});		
		};
	
		initDraw();

		$scope.disableDraw = function(){
			leafletData.getMap().then(function(map) {
				map.off('draw:created');
				map.removeControl($scope.drawControl);
				initDraw();
			});
		}
		
		//decides if should load in map or not
		$scope.getLayer = function(layer){
			var layerName = layer.name;
			var outputFormats = layer.outputFormats;
			var url = layer.url;


			if(layerName === $scope.activeLayer) {
				$scope.layerData = "";
				$scope.layerGroup.clearLayers();
				$scope.activeLayer = "";
				$scope.disableDraw();
				return true;
			}
					
			$scope.isLoadingData = true;
			
			
			$scope.layerData = "";
			$scope.activeLayer = layerName;			
			
			if(outputFormats.indexOf("text/html") != -1){
				$scope.getMapLayer(layerName, url);
				$scope.mapTabActive = true;
			} else {
				$scope.getJsonLayer(layerName, url);
				$scope.mapTab = false;
				$scope.mapTabActive = false;
				//turn off Map tab
				
			}			
		}

		$scope.getMapLayer = function(layerName, layerUrl){
				leafletData.getMap().then(function(map) {

					var features;
					
					$scope.layerGroup.clearLayers();
					map.off('draw:created');
					map.removeControl($scope.drawControl);
					
					
					var layerDocumentation = documentationFactory.apiDocumentation.supportedClass.filter(function(item){
						if(item["ows:name"] === layerName){
							return true;
						}
					})[0];
					
					var featureTypes = layerDocumentation.type;
					

					var options = {
						draw: {
							circle: false,
							rectangle: false,
							marker: false,
							polygon: false,
							polyline: false
						},
						edit: {
							featureGroup: $scope.layerGroup,
							edit: false,
							remove: false
						}
					}

					var canPost = layerDocumentation.supportedOperation.filter(function(item){return item.method === "POST";}).length > 0;
					var canDelete = layerDocumentation.supportedOperation.filter(function(item){return item.method === "DELETE";}).length > 0;
					var canPut = layerDocumentation.supportedOperation.filter(function(item){return item.method === "PUT";}).length > 0;

					//verify if POST operation exists
					if(canPost){

						//point - marker, line - polyline, polygon - polygon
						
						if(featureTypes.indexOf("Point") != -1){
							options.draw.marker = true;
						}
						if(featureTypes.indexOf("LineString") != -1){
							options.draw.polyline = {
								shapeOptions: {
									color: 'blue'
								}
							}
						}
						if(featureTypes.indexOf("Polygon") != -1){
							options.draw.polygon = {
								allowIntersection: false,
								shapeOptions: {
									color: 'blue'
								}
							};
						}

						map.on('draw:created', function (e) {
							var layer = e.layer;
							
							var featureJson = layer.toGeoJSON();

							$scope.openCreateFeature(featureJson,layerDocumentation.supportedProperty).then(function (response) {
								//On ok POST, add popup, add feature to Leaflet
								featureJson = response;
								
								return $http({
									method: 'POST',
									url: layerUrl,
									headers: {
										'Content-Type': 'application/ext.geo+json'
									},
									data: response
								})
							})
							.then(function (response){								
								
								features.addData(featureJson);
								//layer.addTo($scope.layerGroup);
								
							}, function (response) {
								if(response === "cancel"){
									console.log('modal canceled, nothing happens')
								} else {
									//FIXME show error
									console.log(response)
								}
							});	
						});						
					}
					$scope.drawControl = new L.Control.Draw(options);
					map.addControl($scope.drawControl);
						
					$http({
						method: 'GET',
						url: layerUrl,
						headers: {
							'Accept': 'application/ext.geo+json'
						},
					}).then(function successCallback(response) {
	
						$scope.layerData = JSON.stringify(response.data, undefined, 4).substring(0, 50000);
						
						features = L.geoJson(response.data, {onEachFeature: function(feature, layer) {
							//add popup
							layer.on('click', function(e){
								$scope.openEditFeature(feature,layerDocumentation.supportedProperty, canDelete, canPut)
								.then(function(result){
									var url;
									if(result.delete){
										url = layerUrl+"/"+result.delete.id;
										$http({
											method: 'DELETE',
											url: url
										})
										.then(function(result){
											features.removeLayer(layer);
										}, function(error){
											console.log(error)
										})
																			
									} else if(result.update){
										url = layerUrl+"/"+result.update.id;
										$http({
											method: 'PUT',
											url: url,
											data: result.update,
											headers: {
												"Content-Type": "application/ext.geo+json"
											}
										})		
										.then(function(result){
											//FIXME update feature in the screen
										}, function(error){
											console.log(error)
										})									
									}
								}, function(error){
									console.log(error);
								});
							}); 
							
						}});
						$scope.layerGroup.addLayer(features);
						
						
						//fit to feature
						map.fitBounds(features.getBounds());		
						$scope.isLoadingData = false;
						
					}, function errorCallback(response) {
						//FIXME Layer not available
					});
				});
		};
	
		$scope.getJsonLayer = function(layerName, layerUrl){
			$http({
				method: 'GET',
				url: layerUrl,
				headers: {
					'Accept': 'application/ld+json'
				},
			}).then(function successCallback(response) {
				//FIXME right now truncating data

				$scope.layerData = JSON.stringify(response.data, undefined, 4).substring(0, 50000);
				$scope.isLoadingData = false;
				
			}, function errorCallback(response) {
				//FIXME Layer not available
			});		
		}
		
		
		$scope.getOutputMap = function(output) {
			var layerName = output.name;
			var layerUrl = output.url;
			
			if(layerName === $scope.activeLayer) {
				$scope.layerData = "";
				$scope.layerGroup.clearLayers();
				$scope.activeLayer = "";
				$scope.disableDraw();
				return true;
			}
					
			$scope.isLoadingData = true;
			
			$scope.layerData = "";
			$scope.activeLayer = layerName;			

			$scope.mapTabActive = true;
				
			leafletData.getMap().then(function(map) {

				var features;
				
				$scope.layerGroup.clearLayers();
				map.off('draw:created');
				map.removeControl($scope.drawControl);

				var options = {
					draw: {
						circle: false,
						rectangle: false,
						marker: false,
						polygon: false,
						polyline: false
					},
					edit: {
						featureGroup: $scope.layerGroup,
						edit: false,
						remove: false
					}
				}
				$scope.drawControl = new L.Control.Draw(options);
				map.addControl($scope.drawControl);
				
				$http({
					method: 'GET',
					url: layerUrl,
					headers: {
						'Accept': 'application/ext.geo+json'
					},
				}).then(function successCallback(response) {

					$scope.layerData = JSON.stringify(response.data, undefined, 4).substring(0, 50000);
					
					features = L.geoJson(response.data, {onEachFeature: function(feature, layer) {
						//add popup
						layer.on('click', function(e){
							$scope.openEditFeature(feature,[], false, false)
							.then(function(result){

							}, function(error){
								console.log(error);
							});
						}); 
						
					}});
					$scope.layerGroup.addLayer(features);
					
					
					//fit to feature
					map.fitBounds(features.getBounds());		
					$scope.isLoadingData = false;
					
				}, function errorCallback(response) {
					//FIXME Layer not available
				});
			});			
		}
	};
	
	ClassContentController.$inject = ['$scope', '$http', 'leafletData', 'documentationFactory', '$uibModal'];
	
	angular.module('genericClientApp')
		.controller('ClassContentController', ClassContentController);



	//CREATE FEATURE CONTROLLER ----------------------------------------------------------------------
	var CreateFeatureCtrl = function ($scope, $uibModalInstance, feature, properties) {
		
		$scope.properties = properties.map(function(item){
			return {
				name: item['hydra:title'],
				description: item['hydra:description'],
				required: item['required'],	
				//type
			}
		});

		$scope.newFeature = feature;
		
		$scope.id = "";
		
		$scope.ok = function () {
			//fix to JSON-LD
			$scope.newFeature["@id"] = "http://www.example.com/"+$scope.id; //FIXME namespace of new feature
			$scope.newFeature["id"] = $scope.id;
			$scope.newFeature["@type"] = $scope.newFeature["type"];
			$scope.newFeature.geometry["@type"] = $scope.newFeature.geometry["type"];
			
			$uibModalInstance.close($scope.newFeature);
		};
		
		$scope.cancel = function () {
			$uibModalInstance.dismiss('cancel');
		};
	};

	CreateFeatureCtrl.$inject = ['$scope', '$uibModalInstance', 'feature', 'properties'];
	
	angular.module('genericClientApp')
		.controller('CreateFeatureCtrl', CreateFeatureCtrl);

	
	//EDIT FEATURE CONTROLLER ----------------------------------------------------------------------
	var EditFeatureCtrl = function ($scope, $uibModalInstance, feature, properties, canDelete, canPut) {
		
		$scope.feature = JSON.parse(JSON.stringify(feature));
		$scope.editing = false;
		$scope.canPut = canPut;
		$scope.canDelete = canDelete;
		
		$scope.isRequired = function(key){
			var required = false;
			
			properties.forEach(function(item){
				if(item["hydra:title"] === key){
					required = item.required;
				}
			});
			return required;			
		}
		
		$scope.canEdit = function(key){
			var readonly = false;
			
			properties.forEach(function(item){
				if(item["hydra:title"] === key){
					readonly = item.readonly;
				}
			});
			return !readonly && $scope.editing; 
			
		}
		
		
		$scope.deleteFeature = function () {

			$uibModalInstance.close({"delete": $scope.feature, "update": null});
		};
		
		$scope.editFeature = function () {

			$uibModalInstance.close({"delete": null, "update": $scope.feature});
		};
		
		$scope.cancel = function () {
			$uibModalInstance.dismiss('cancel');
		};
	};

	EditFeatureCtrl.$inject = ['$scope', '$uibModalInstance', 'feature', 'properties', 'canDelete', 'canPut'];
	
	angular.module('genericClientApp')
		.controller('EditFeatureCtrl', EditFeatureCtrl);
})();