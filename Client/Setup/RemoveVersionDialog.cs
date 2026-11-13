//-----------------------------------------------------------------------
// <copyright>
// Copyright (C) 2026 jsuomi
//
// This file is subject to the terms and conditions of the Microsoft Public License (MS-PL).
// See http://www.microsoft.com/opensource/licenses.mspx#Ms-PL for more details.
// </copyright>
//-----------------------------------------------------------------------

//#define VSDesigner

using System;
using System.ComponentModel;
using System.Windows.Forms;
using Microsoft.Web.Management.Client.Win32;
using Web.Management.PHP.Config;

namespace Web.Management.PHP.Setup
{

    internal sealed class RemoveVersionDialog :
#if VSDesigner
        Form
#else
        TaskForm
#endif
    {
        private readonly PHPModule _module;

        private ManagementPanel _contentPanel;
        private Label _selectVersionLabel;
        private ComboBox _versionComboBox;
        private Label _noteLabel;

        /// <summary>
        /// Required designer variable.
        /// </summary>
        private readonly IContainer components = null;

        public RemoveVersionDialog(PHPModule module) : base(module)
        {
            _module = module;
            InitializeComponent();
            InitializeUI();
        }

        protected override bool CanAccept
        {
            get
            {
                return (_versionComboBox.SelectedItem != null);
            }
        }

        protected override bool CanShowHelp
        {
            get
            {
                return true;
            }
        }

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        private void InitializeComponent()
        {
            _selectVersionLabel = new Label();
            _versionComboBox = new ComboBox();
            _noteLabel = new Label();
            SuspendLayout();
            //
            // _selectVersionLabel
            //
            _selectVersionLabel.AutoSize = true;
            _selectVersionLabel.Location = new System.Drawing.Point(0, 13);
            _selectVersionLabel.Name = "_selectVersionLabel";
            _selectVersionLabel.Size = new System.Drawing.Size(102, 13);
            _selectVersionLabel.TabIndex = 0;
            _selectVersionLabel.Text = Resources.RemoveVersionDialogSelectVersion;
            //
            // _versionComboBox
            //
            _versionComboBox.DropDownStyle = ComboBoxStyle.DropDownList;
            _versionComboBox.FormattingEnabled = true;
            _versionComboBox.Location = new System.Drawing.Point(3, 30);
            _versionComboBox.Name = "_versionComboBox";
            _versionComboBox.Size = new System.Drawing.Size(326, 21);
            _versionComboBox.TabIndex = 1;
            //
            // _noteLabel
            //
            _noteLabel.Location = new System.Drawing.Point(0, 62);
            _noteLabel.Name = "_noteLabel";
            _noteLabel.Size = new System.Drawing.Size(330, 52);
            _noteLabel.TabIndex = 2;
            _noteLabel.Text = Resources.RemoveVersionDialogNote;
            //
            // RemoveVersionDialog
            //
            ClientSize = new System.Drawing.Size(364, 160);
            Controls.Add(_noteLabel);
            Controls.Add(_versionComboBox);
            Controls.Add(_selectVersionLabel);
            Name = "RemoveVersionDialog";
            ResumeLayout(false);
#if VSDesigner
            PerformLayout();
#endif
        }

        private void InitializeUI()
        {
            _contentPanel = new ManagementPanel();
            _contentPanel.SuspendLayout();

            _contentPanel.Location = new System.Drawing.Point(0, 0);
            _contentPanel.Dock = DockStyle.Fill;
            _contentPanel.Controls.Add(_selectVersionLabel);
            _contentPanel.Controls.Add(_versionComboBox);
            _contentPanel.Controls.Add(_noteLabel);

            _contentPanel.ResumeLayout(false);
            _contentPanel.PerformLayout();

            Text = Resources.RemoveVersionDialogTitle;

            SetContent(_contentPanel);
            UpdateTaskForm();
        }

        protected override void OnAccept()
        {
            var selectedItem = (PHPVersion)_versionComboBox.SelectedItem;

            try
            {
                _module.Proxy.UnregisterPHPVersion(selectedItem.HandlerName);
                DialogResult = DialogResult.OK;
            }
            catch (Exception ex)
            {
                DisplayErrorMessage(ex, Resources.ResourceManager);
            }
            Close();
        }

        private void OnGetVersionsDoWork(object sender, DoWorkEventArgs e)
        {
            e.Result = new object[] { _module.Proxy.GetAllPHPVersions(), _module.Proxy.GetPHPConfigInfo() };
        }

        private void OnGetVersionsDoWorkCompleted(object sender, RunWorkerCompletedEventArgs e)
        {
            _versionComboBox.BeginUpdate();
            _versionComboBox.SuspendLayout();

            try
            {
                var results = (object[])e.Result;
                var phpVersions = (RemoteObjectCollection<PHPVersion>)results[0];
                var configInfo = (PHPConfigInfo)results[1];
                var activeHandlerName = configInfo != null ? configInfo.HandlerName : null;

                // The active version is offered only when it is the last one.
                foreach (var phpVersion in phpVersions)
                {
                    if (phpVersions.Count > 1 &&
                        String.Equals(phpVersion.HandlerName, activeHandlerName, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    phpVersion.Version = String.Format("{0} ({1})", phpVersion.Version, phpVersion.ScriptProcessor);
                    _versionComboBox.Items.Add(phpVersion);
                }
                _versionComboBox.DisplayMember = "Version";
                if (_versionComboBox.Items.Count > 0)
                {
                    _versionComboBox.SelectedIndex = 0;
                }
                UpdateTaskForm();
            }
            catch (Exception ex)
            {
                DisplayErrorMessage(ex, Resources.ResourceManager);
            }
            finally
            {
                _versionComboBox.ResumeLayout();
                _versionComboBox.EndUpdate();
            }
        }

        protected override void OnLoad(EventArgs e)
        {
            base.OnLoad(e);

            StartAsyncTask(OnGetVersionsDoWork, OnGetVersionsDoWorkCompleted);
        }

        protected override void ShowHelp()
        {
            Helper.Browse(Globals.ChangeVersionOnlineHelp);
        }
    }
}
