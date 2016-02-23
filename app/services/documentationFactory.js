(function () {
	var documentationFactory = function ($http, $q) {
		var factory = {};

		factory.apiDocumentation = null;

		factory.verifyHeadersDoc = function (url) {
			var q = $q.defer();

			$http({
				method: 'HEAD',
				url: url
			}).then(function successCallback(response) {
				var links = response.headers('Link') || "";
				console.log(links)
				var doc = links.split(',').filter(function (link) {

					if (link.split(';')[1] && link.split(';')[1].replace(/rel="(.*)"/, '$1').trim() === "http://www.w3.org/ns/hydra/core#apiDocumentation") {
						return true;
					}
					return false;
				})
				console.log(doc)
				if (doc.length === 1) {
					//Documentation found - Try to get document
					q.resolve(doc[0].split(';')[0].replace(/<(.*)>/, '$1').trim());
				} else {
					q.reject('Documentation header not available');
				}

			}, function errorCallback(response) {
				q.reject('URL not available');
			});

			return q.promise;
		};

		factory.verifyDoc = function (url) {
			var q = $q.defer();

			$http({
				method: 'GET',
				url: url
			}).then(function successCallback(response) {
				//Verify if is a valid APIDocumentation document
				if (response.data["@type"] && response.data["@type"] === "ApiDocumentation") {

					factory.apiDocumentation = response.data;
					q.resolve(true);
				} else {
					q.reject('Invalid Documentation');
				}

			}, function errorCallback(response) {
				q.reject('Documentation file not available');
			});

			return q.promise;
		};

		factory.verifyHeadersDescribeLayers = function (url) {
			var q = $q.defer();

			$http({
				method: 'HEAD',
				url: url
			}).then(function successCallback(response) {
				var links = response.headers('Link') || "";
				var context = null;
				var schema = null;

				links.split(',').forEach(function (link) {
					if (link.split(';')[1] && link.split(';')[1].replace(/rel="(.*)"/, '$1').trim() === "http://www.w3.org/ns/json-ld#context") {
						context = link.split(';')[0].replace(/<(.*)>/, '$1').trim()
					} else if (link.split(';')[1] && link.split(';')[1].replace(/rel="(.*)"/, '$1').trim() === "http://json-schema.org/json-schema") {
						schema = link.split(';')[0].replace(/<(.*)>/, '$1').trim()
					}
				})

				if (context && schema) {
					//Documentation found - Try to get document
					q.resolve({ context: context, schema: schema });
				} else {
					q.reject('Documentation header not available');
				}


			}, function errorCallback(response) {
				q.reject('Class URL not available');

			});
			return q.promise;
		};

		factory.verifyDescribeLayers = function (url) {
			var q = $q.defer();

			$http({
				method: 'GET',
				url: url
			}).then(function successCallback(response) {
				q.resolve(response.data);

			}, function errorCallback(response) {
				q.reject('Documentation file not available');

			});
			
			return q.promise;
		};

		return factory;
	};

	documentationFactory.$inject = ['$http', '$q'];

	angular.module('genericClientApp')
		.factory('documentationFactory', documentationFactory)

})();