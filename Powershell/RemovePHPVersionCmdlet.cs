//-----------------------------------------------------------------------
// <copyright>
// Copyright (C) 2026 jsuomi
//
// This file is subject to the terms and conditions of the Microsoft Public License (MS-PL).
// See http://www.microsoft.com/opensource/licenses.mspx#Ms-PL for more details.
// </copyright>
//-----------------------------------------------------------------------

using System;
using System.Management.Automation;
using Microsoft.Web.Administration;
using Web.Management.PHP.Config;

namespace Web.Management.PHP.Powershell
{

    [Cmdlet(VerbsCommon.Remove, "PHPVersion",
            SupportsShouldProcess = true,
            ConfirmImpact = ConfirmImpact.Medium)]
    public sealed class RemovePHPVersionCmdlet : BaseCmdlet
    {
        private bool _force;

        [Parameter(Mandatory = false)]
        public SwitchParameter Force
        {
            get {
                 return _force;
            }
            set {
                 _force = value;
            }
        }

        [Parameter(Mandatory = true,
            ValueFromPipelineByPropertyName = true,
            Position = 0)]
        public string HandlerName { get; set; }

        protected override void DoProcessing()
        {
            using (var serverManager = new ServerManager())
            {
                var serverManagerWrapper = new ServerManagerWrapper(serverManager, SiteName, VirtualPath);
                var configHelper = new PHPConfigHelper(serverManagerWrapper);
                var handler = configHelper.GetPHPHandlerByName(HandlerName);
                if (handler != null)
                {
                    if (ShouldProcess(HandlerName))
                    {
                        string warningMessage = String.Format(Resources.RemoveVersionWarningMessage, handler.Name, handler.Executable);
                        if (Force || ShouldContinue(warningMessage, Resources.DeleteSettingWarningCaption))
                        {
                            configHelper.UnregisterPHPHandler(handler.Name);
                        }
                    }
                }
                else
                {
                    var ex = new ArgumentException(String.Format(Resources.HandlerDoesNotExistError, HandlerName));
                    ReportNonTerminatingError(ex, "InvalidArgument", ErrorCategory.ObjectNotFound);
                }
            }
        }
    }
}
