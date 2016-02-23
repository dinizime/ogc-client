(function () {
	'use strict';
	
	//Receives the URL from the client and verify if it have a valid documentation header
	//If it has it will request the documentation
	var DocumentationController = function ($scope, documentationFactory, $location) {

		$scope.errorMsg = null;
		
		//Verify if given URL have headers that point to an ApiDocumentation
		//Verify if the documentation header points to a valid documentation
		$scope.requestDocumentation = function (url) {
			
			//Returns an URL or an Error
			documentationFactory.verifyHeadersDoc(url)
				.then(function success(response) {
					//Returns an error or a true response
					//If successful instantiate documentationFactory.apiDocumentation
					//If all valid it changes screen
					return documentationFactory.verifyDoc(response);

				})
				.then(function sucess(response) {

					//redirects application
					$location.path('main')

				}, function error(response) {

					$scope.errorMsg = response;

				});
		}
	};

	DocumentationController.$inject = ['$scope', 'documentationFactory', '$location'];

	angular.module('genericClientApp')
		.controller('DocumentationController', DocumentationController);

})();