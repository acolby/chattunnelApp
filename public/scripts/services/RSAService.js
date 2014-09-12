'use strict';

angular.module('chattunnel')
	.factory('RSAService', function() {

		function generateRandomString(length) {
			var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
			var text = '';
			for (var i = 0; i < length; i++) {
				text += possible.charAt(Math.floor(Math.random() * possible.length));
			}
			return text;
		}
		// generate public/privage key pare
		function generatePublicPrivateKeyPair(strength) {
			if(!(strength === 256 || strength === 512 || strength === 1024 || strength === 2048)){
				strength = 512;
			}
			var bits = strength;
			var privateKey = cryptico.generateRSAKey(generateRandomString(40), bits);
			var keys = {
				'public': cryptico.publicKeyString(privateKey),
				'private': privateKey
			};
			return keys;
		}

		function encryptMessage(message, publicKey, privateKey) {
			return cryptico.encrypt(message, publicKey, privateKey);
		}

		function decryptMessage(cipher, privateKey) {
			return cryptico.decrypt(cipher, privateKey);
		}

		var encryptionStrenth = 2048;

		return {
			'generate': function(strength){
				var keys = generatePublicPrivateKeyPair(strength);
				var object = {
					'encrypt': function(json, toPublicKey){
						var details = encryptMessage(JSON.stringify(json), toPublicKey, keys.private);
						if(details.status === 'success'){
							return details.cipher;
						}else{
							return false;
						}
					},
					'decrypt': function(cipher){
						var details = decryptMessage(cipher, keys.private);
						if(details.status === 'success' && details.signature === 'verified'){
							return details;
						}else{
							return false;
						}
					},
					'getPublicKey': function(){
						return keys.public;
					}
				};
				return object;
			}
		};
	});