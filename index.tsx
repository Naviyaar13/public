import React, { useState } from "react";
import Offcanvas from "..";
import { useNodes, useSetNodes } from "@/redux/hooks/useFlow";
import CustomLabel from "@/ui/customLabel";
import MailIcon from "@/assets/icons/mail.svg?react";
import CustomButton from "@/ui/customButton";
import ChooseType from "@/ui/modal/mailModal/index";
import CustomInput from "@/ui/customInput";
import type { Node } from "reactflow";
import { getPreviousNodeOptions } from "@/utils/getPreviousNode";
import CustomDropdown from "@/ui/customDropDown";
import ToggleSwitch from "@/ui/toggleSwitch";
import Backslash from "@/assets/icons/backslash.svg?react";
import editImg from "@/assets/icons/edit.svg";
import deleteImg from "@/assets/icons/delete.svg";

interface Template {
  _id: string;
  name: string;
}

interface MailOffcanvasProps {
  isOpen: boolean;
  handleClose: () => void;
  nodeId: string;
  nodeName?: string;
}
interface mailDetails extends Node {
  mail_action?: string;
  message?: string;
  mail_to?: string;
  template_id?: string;
  template_name?: string;
  mailMessageId?: string;
  req_payload?: Record<string, string>;
  req_url?: string;
}

const MailOffcanvas: React.FC<MailOffcanvasProps> = ({
  isOpen,
  handleClose,
  nodeId,
  nodeName,
}) => {
  const nodes = useNodes();
  const setNodes = useSetNodes();
  const currentNodeDetails: mailDetails = nodes?.find(
    (node) => node.id === nodeId
  );

  // previous node result usage
  const isFromResult =
    currentNodeDetails?.message?.startsWith("fromresult/") || false;
  const initialSourceNodeId = isFromResult
    ? currentNodeDetails?.message?.replace("fromresult/", "")
    : "";

  const [usePreviousNode, setUsePreviousNode] = useState(isFromResult);
  const [message, setMessage] = useState(
    !isFromResult ? currentNodeDetails?.message || "" : ""
  );
  const [sourceNodeId, setSourceNodeId] = useState(initialSourceNodeId);

  // recipient + template
  const [recipient, setRecipient] = useState(currentNodeDetails?.to);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>({
    _id: currentNodeDetails?.template_id!!,
    name: currentNodeDetails?.template_name!! || "Choose Template",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showChooseType, setShowChooseType] = useState(false);

  // agent request data
//   const [url, setUrl] = useState(currentNodeDetails?.req_url || "");
  const [requestData, setRequestData] = useState<Record<string, string>>(
    currentNodeDetails?.req_payload || {}
  );
  const [showRequestDataForm, setShowRequestDataForm] = useState(false);
  const [currentKey, setCurrentKey] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [useResultValue, setUseResultValue] = useState(false);
  const [editingIndex, setEditingIndex] = useState<string | null>(null);
  const [keyError, setKeyError] = useState(false);
  const [valueError, setValueError] = useState(false);

  const previousNodes = getPreviousNodeOptions(nodeId, nodes);

  const handleTemplateSelect = (template: unknown) => {
    const t = template as Template;
    setSelectedTemplate(t);
    if (formErrors.template) {
      setFormErrors((prev) => ({ ...prev, template: "" }));
    }
  };

  const handleAddRequestData = (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    if (!currentKey.trim()) {
      setKeyError(true);
      hasError = true;
    }

    if (useResultValue && !currentValue) {
      setValueError(true);
      hasError = true;
    } else if (!useResultValue && !currentValue.trim()) {
      setValueError(true);
      hasError = true;
    }

    if (hasError) return;

    setRequestData((prev) => {
      const newData = { ...prev };
      if (editingIndex !== null && editingIndex !== currentKey) {
        delete newData[editingIndex];
      }
      return {
        ...newData,
        [currentKey]: useResultValue
          ? `fromresult/${currentValue}`
          : currentValue,
      };
    });

    setCurrentKey("");
    setCurrentValue("");
    setUseResultValue(false);
    setEditingIndex(null);
    setShowRequestDataForm(false);
  };

  const handleEditRequestData = (key: string) => {
    setCurrentKey(key);
    const isFromResultNode = requestData[key]?.startsWith("fromresult/");
    setUseResultValue(isFromResultNode);
    setCurrentValue(
      isFromResultNode
        ? requestData[key].replace("fromresult/", "")
        : requestData[key]
    );
    setEditingIndex(key);
    setShowRequestDataForm(true);
  };

  const handleDeleteRequestData = (key: string) => {
    setRequestData((prev) => {
      const newData = { ...prev };
      delete newData[key];
      return newData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!recipient?.trim()) {
      errors.recipient = "Recipient is required";
    }
    if (!selectedTemplate || !selectedTemplate._id) {
      errors.template = "Please select a template";
    }
    

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const mailConfig = {
      mail_action: "send",
      to: recipient,
      template_id: selectedTemplate?._id || "",
      template_name: selectedTemplate?.name || "",
      mailMessageId:
        currentNodeDetails?.mailMessageId ||
        `#mail${Math.floor(Math.random() * 8000) + 1000}`,
     req_payload: requestData,
    };

	console.log("Payload (req_payload):", mailConfig.req_payload);
	console.log("mailConfig:", mailConfig);

    setNodes((prevNodes) => {
      const nodeIndex = prevNodes.findIndex((node) => node.id === nodeId);
      if (nodeIndex === -1) return prevNodes;

      const updatedNodes = [...prevNodes];
      updatedNodes[nodeIndex] = {
        ...updatedNodes[nodeIndex],
        ...mailConfig,
      };
      return updatedNodes;
    });

    handleClose();
  };

  return (
    <>
      {/* overlay for template modal */}
      {showChooseType && <div className="fixed inset-0 bg-black/40 z-40" />}

      {!showChooseType && (
        <Offcanvas
          isOpen={isOpen}
          onClose={handleClose}
          placement="end"
          nodeName={nodeName ?? ""}
        >
          <div className="flex-1 p-4 h-[calc(100%-56px)] overflow-y-auto">
            {!showRequestDataForm ? (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col justify-between h-full"
              >
                <div>
                  {/* Recipient */}
                  <div className="mb-4">
                    <CustomInput
                      label="Recipient Email"
                      type="email"
                      placeholder="Enter recipient email"
                      value={recipient!!}
                      onChange={(value) => {
                        setRecipient(value);
                        setFormErrors((prev) => ({
                          ...prev,
                          recipient: "",
                        }));
                      }}
                      error={formErrors.recipient}
                    />
                  </div>

                  {/* Template */}
                  <div className="mb-4">
                    <CustomLabel label="Select Template" />
                    <div className="flex items-center border border-gray-300 rounded p-2">
                      <div className="mr-2">
                        <MailIcon className="w-5 h-5" />
                      </div>
                      <button
                        type="button"
                        className="text-[14px] text-black hover:text-gray-700 focus:outline-none"
                        onClick={() => setShowChooseType(true)}
                      >
                        {selectedTemplate ? selectedTemplate.name : ""}
                      </button>
                    </div>
                    {formErrors.template && (
                      <div className="text-red-500 text-xs mt-1">
                        {formErrors.template}
                      </div>
                    )}
                  </div>

                

                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <CustomLabel label={"Placeholder"} required={true} />
                      <button
                        type="button"
                        onClick={() => setShowRequestDataForm(true)}
                        className="text-text bg-transparent border-0 text-base"
                      >
                        + Add
                      </button>
                    </div>
                    <div className="max-h-[300px] bg-red overflow-y-auto hide-scrollbar">
                      {Object.entries(requestData).map(
                        ([key, value], index) => (
                          <div
                            key={index}
                            className="flex flex-col mb-2 border p-2"
                          >
                            <div className="flex justify-end border-b p-1">
                              <button
                                type="button"
                                onClick={() => handleEditRequestData(key)}
                                className="p-0 mr-2"
                              >
                                <img
                                  src={editImg}
                                  alt="Edit"
                                  className="w-4 h-4"
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRequestData(key)}
                                className="p-0 text-red-500"
                              >
                                <img
                                  src={deleteImg}
                                  alt="Delete"
                                  className="w-4 h-4"
                                />
                              </button>
                            </div>
                            <div className="flex-grow p-2 text-sm">
                              <span>{key}: </span>
                              <span title={value}>
                                {value?.startsWith("fromresult/")
                                  ? `${
                                      nodes.find(
                                        (n) =>
                                          n.id ===
                                          value.replace("fromresult/", "")
                                      )?.data?.name || "Node"
                                    }_result_value`
                                  : value?.length > 15
                                  ? `${value?.substring(0, 15)}...`
                                  : value}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex gap-2 justify-center rounded text-xs items-center">
                  <CustomButton
                    onClickFunction={(e) => handleSubmit(e)}
                    text={currentNodeDetails?.mailMessageId ? "Update" : "Save"}
                  />
                </div>
              </form>
            ) : (
              <div>
                <div
                  onClick={() => {
                    setShowRequestDataForm(false);
                    setCurrentKey("");
                    setCurrentValue("");
                    setEditingIndex(null);
                    setUseResultValue(false);
                  }}
                  className="mb-3 p-0 border-0 font-semibold flex items-center cursor-pointer"
                >
                  <Backslash /> <span className="ml-3">Placeholder</span>
                </div>

                <div className="mb-3">
                  <CustomLabel label={"Key"} required={true} />
                  <input
                    type="text"
                    value={currentKey}
                    onChange={(e) => {
                      setCurrentKey(e.target.value);
                      if (keyError) setKeyError(false);
                    }}
                    placeholder="Enter key (e.g. Email)"
                    className={`w-full p-2 border rounded-sm ${
                      keyError ? "border-red-700" : ""
                    }`}
                    autoComplete="off"
                  />
                  {keyError && (
                    <div className="text-red-700 text-sm mt-1">
                      Key is required
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mb-2">
                  <CustomLabel label={"Value"} required={true} />
                  <div className="flex items-center">
                    <ToggleSwitch
                      label="Use Previous Node as Source"
                      checked={useResultValue}
                      onChange={() => {
                        const newUseResultValue = !useResultValue;
                        setUseResultValue(newUseResultValue);
                        setCurrentValue(newUseResultValue ? "" : "");
                      }}
                    />
                  </div>
                </div>

                {useResultValue ? (
                  <div className="mb-3">
                    <CustomLabel label="Select Previous Node" required={true} />
                    <CustomDropdown
                      options={previousNodes}
                      selectedOption={currentValue}
                      setSelectedOption={(value) => setCurrentValue(value)}
                      style={{
                        width: "100%",
                        borderColor: "rgb(209, 213, 219)",
                      }}
                    />
                  </div>
                ) : (
                  <div className="mb-3">
                    <textarea
                      rows={3}
                      value={currentValue}
                      onChange={(e) => {
                        setCurrentValue(e.target.value);
                        if (valueError) setValueError(false);
                      }}
                      placeholder="Enter value"
                      className={`w-full p-2 border rounded-sm resize-none ${
                        valueError ? "border-red-700" : ""
                      }`}
                    />
                    {valueError && (
                      <div className="text-red-700 text-sm mt-1">
                        Value is required
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddRequestData}
                  className="w-full bg-black text-white py-2 rounded-sm text-sm"
                >
                  {editingIndex ? "Update" : "Add"}
                </button>
              </div>
            )}
          </div>
        </Offcanvas>
      )}

      {/* Template modal */}
      <ChooseType
        isOpen={showChooseType}
        onClose={() => setShowChooseType(false)}
        onSelect={(val) => {
          handleTemplateSelect(val);
          setShowChooseType(false);
        }}
        title="Select or Create a Template"
      />
    </>
  );
};

export default React.memo(MailOffcanvas);
