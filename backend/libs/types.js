"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentStatus = void 0;
var DeploymentStatus;
(function (DeploymentStatus) {
    DeploymentStatus["PENDING"] = "PENDING";
    DeploymentStatus["INITIALIZING"] = "INITIALIZING";
    DeploymentStatus["PLANNING"] = "PLANNING";
    DeploymentStatus["DEPLOYING"] = "DEPLOYING";
    DeploymentStatus["COMPLETED"] = "COMPLETED";
    DeploymentStatus["FAILED"] = "FAILED";
    DeploymentStatus["DESTROYING"] = "DESTROYING";
    DeploymentStatus["DESTROYED"] = "DESTROYED";
})(DeploymentStatus || (exports.DeploymentStatus = DeploymentStatus = {}));
