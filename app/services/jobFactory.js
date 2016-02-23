(function () {
	var jobFactory = function ($http, $q) {
		var factory = {};

		factory.jobs = [];
		
		//array of objects with {name: outputName, url: outputUrl}
		factory.outputs = {};
		factory.outputs.values = [];
		factory.showOutputs = {};
		factory.showOutputs.value = factory.outputs.values.length > 0;

		factory.getJobs = function (url, input) {
			var q = $q.defer();

			$http({
				method: 'POST',
				url: url,
				headers: {
					'Content-Type': 'application/ld+json'
				},
				data: input.data
			}).then(function successCallback(response) {

				var location = response.headers('Location');

				$http({
					method: 'GET',
					url: location,
					headers: {
						'Accept': 'application/ld+json'
					},
				}).then(function successCallback(response) {

					var job = response.data;
					job['url'] = location;
					delete job['@context']
					job['name'] = input.name;
					job['operation'] = url;

					factory.jobs.unshift(job);
					q.resolve(job);

				}, function errorCallback(response) {
					//FIXME Layer not available
					q.reject(response);
				});

			}, function errorCallback(response) {
				//FIXME Layer not available
				q.reject(response);
			});

			return q.promise;
		};

		factory.deleteJob = function (job) {
			var q = $q.defer();

			$http({
				method: 'DELETE',
				url: job.url,
			}).then(function successCallback(response) {

				for (var i = 0; i < factory.jobs.length; i++) {
					var obj = factory.jobs[i];

					if (obj.jobID === job.jobID) {
						factory.jobs.splice(i, 1);
						break;
					}
				}

				if (job.status === "Succeeded") {
					for (var i = 0; i < factory.outputs.values.length; i++) {
						if (factory.outputs.values[i].name.split('-')[0] === job.name) {
							factory.outputs.values.splice(i, 1);
						}

					}
				}
				q.resolve(true);

			}, function errorCallback(response) {
				//FIXME Layer not available
				q.reject(response);
			});

			return q.promise;
		}

		factory.updateJob = function (job) {
			var q = $q.defer();

			$http({
				method: 'GET',
				url: job.url,
			}).then(function successCallback(response) {
				var jobUpdated = response.data;
				jobUpdated['url'] = job.url;
				delete jobUpdated['@context']
				jobUpdated['name'] = job.name;
				jobUpdated['operation'] = job.operation;

				for (var i = 0; i < factory.jobs.length; i++) {
					var obj = factory.jobs[i];

					if (obj.jobID === job.jobID) {
						factory.jobs[i] = jobUpdated;
						break;
					}
				}
				q.resolve(true);

			}, function errorCallback(response) {
				//FIXME Layer not available
				q.reject(response);
			});

			return q.promise;
		}

		factory.addOutputs = function (job, outputsDoc) {
			var q = $q.defer();


			$http({
				method: 'GET',
				url: job.resultsUrl,
			}).then(function successCallback(response) {

				var results = response.data;
				delete results['@context'];
				delete results['@type'];

				Object.keys(results).forEach(function (key) {

					var outputDoc = outputsDoc.filter(function (item) {
						if (item["ows:title"] === key) {
							return true;
						}
					})[0];

					var outputFormats = outputDoc["ows:formats"];

					var outputName = job.name + "-" + key;

					factory.outputs.values.push({ name: outputName, url: results[key], outputFormats: outputFormats });
					factory.showOutputs.value = factory.outputs.values.length > 0;
				});
				q.resolve(true);

			}, function errorCallback(response) {
				//FIXME Layer not available
				q.reject(response);
			});
			
			return q.promise;
		}


		return factory;
	};



	jobFactory.$inject = ['$http', '$q'];

	angular.module('genericClientApp')
		.factory('jobFactory', jobFactory)

})();